import { NextResponse } from "next/server";
import { montarUsuarioSessao } from "@/lib/auth/usuario";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Login simplificado (e-mail + senha) via Supabase Auth. Em caso de sucesso a
 * sessão é gravada em cookies httpOnly pelo `@supabase/ssr`; o `proxy.ts`
 * passa a liberar as páginas do painel. Sem cadastro nem recuperação de senha
 * por enquanto — usuários são criados pelo administrador no Supabase.
 *
 * Corpo: { email, senha }
 */
export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const email: unknown = corpo?.email;
  const senha: unknown = corpo?.senha;

  if (typeof email !== "string" || !email.trim() || typeof senha !== "string" || !senha) {
    return NextResponse.json({ erro: "Informe 'email' e 'senha'." }, { status: 400 });
  }

  const supabase = await criarClienteSupabaseServidor();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: senha,
  });

  if (error || !data.user) {
    // Mensagem genérica de propósito: não revelar se o e-mail existe.
    return NextResponse.json({ erro: "E-mail ou senha inválidos." }, { status: 401 });
  }

  return NextResponse.json({ usuario: montarUsuarioSessao(data.user) });
}
