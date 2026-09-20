import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { obterConfigSupabasePublica } from "./chave-publica";

/**
 * Rotas de página acessíveis sem sessão. `/health` é a página de Health Score
 * compartilhável com o cliente final (token opaco na URL, não é dado sensível
 * de sessão) — ver lib/painel/health-publico.ts.
 */
const ROTAS_PUBLICAS = ["/login", "/health"];

/**
 * Renova o token de sessão do Supabase a cada requisição (Server Components
 * não conseguem gravar cookies) e aplica o guard de autenticação: sem sessão
 * → `/login`; com sessão em `/login` → `/`.
 */
export async function atualizarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request });
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

  // Não executar nada entre createServerClient e getClaims(): é essa chamada
  // que renova o token e evita logouts aleatórios.
  const { data } = await supabase.auth.getClaims();
  const autenticado = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  const rotaPublica = ROTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  if (!autenticado && !rotaPublica) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  if (autenticado && rotaPublica) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return resposta;
}
