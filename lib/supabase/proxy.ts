import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { obterConfigSupabasePublica } from "./chave-publica";

/** Rotas que funcionam sem sessão. */
const ROTAS_PUBLICAS = ["/login", "/health"];

/**
 * Rotas que só fazem sentido para quem NÃO está logado.
 *
 * O Health Score compartilhável fica de fora: o link é enviado para terceiros,
 * mas nada impede que quem o abra também tenha conta. Antes, um usuário logado
 * que clicasse no link era jogado para o painel e nunca via a página.
 */
const ROTAS_SO_DESLOGADO = ["/login"];

function casa(pathname: string, rotas: string[]) {
  return rotas.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export async function atualizarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  let autenticado = false;

  /*
   * Sem cookie de sessão não há o que validar, e perguntar ao Supabase só pode
   * dar "não autenticado". Pular a chamada economiza uma ida à rede antes do
   * primeiro byte de HTML — exatamente o tempo em que quem abriu o link está
   * olhando para uma tela em branco, já que nada pode ser pintado antes da
   * resposta do servidor.
   */
  if (temCookieDeSessao(request)) {
    const { url, chave } = obterConfigSupabasePublica();

    const supabase = createServerClient(url, chave, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          resposta = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            resposta.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) => resposta.headers.set(key, value));
        },
      },
    });

    /*
     * `getUser()` e não `getClaims()`: o segundo apenas confere a assinatura do
     * JWT localmente e continua aceitando uma sessão já revogada ou com refresh
     * token inválido. Como as páginas usam `getUser()`, o middleware passava a
     * requisição adiante e a página redirecionava de volta para /login — que o
     * middleware devolvia para /, fechando um laço de 307 que só terminava
     * limpando os cookies na mão. Aqui os dois lados passam a enxergar o mesmo.
     */
    try {
      const { data, error } = await supabase.auth.getUser();
      autenticado = Boolean(data?.user) && !error;
    } catch {
      autenticado = false;
    }
  }

  const { pathname } = request.nextUrl;

  if (!autenticado && !casa(pathname, ROTAS_PUBLICAS)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    return limparCookiesDeSessao(NextResponse.redirect(destino), request);
  }

  if (autenticado && casa(pathname, ROTAS_SO_DESLOGADO)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return resposta;
}

/** O Supabase guarda a sessão em `sb-<ref>-auth-token`, fatiado em `.0`, `.1`… */
const COOKIE_DE_SESSAO = /^sb-.*-auth-token/;

function temCookieDeSessao(request: NextRequest) {
  return request.cookies.getAll().some((cookie) => COOKIE_DE_SESSAO.test(cookie.name));
}

/**
 * Apaga os cookies de sessão do Supabase ao mandar alguém para o login.
 *
 * Sem isso, um cookie corrompido ou expirado continua sendo reenviado a cada
 * requisição e trava o acesso até a pessoa limpar os dados do navegador — o
 * que ninguém faz no meio de uma demonstração.
 */
function limparCookiesDeSessao(resposta: NextResponse, request: NextRequest) {
  for (const cookie of request.cookies.getAll()) {
    if (COOKIE_DE_SESSAO.test(cookie.name)) {
      resposta.cookies.delete(cookie.name);
    }
  }
  return resposta;
}
