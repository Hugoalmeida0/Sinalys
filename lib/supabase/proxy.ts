import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { obterConfigSupabasePublica } from "./chave-publica";

const ROTAS_PUBLICAS = ["/login", "/health"];

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
