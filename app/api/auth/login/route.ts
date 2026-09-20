import { NextResponse } from "next/server";
import { montarUsuarioSessao } from "@/lib/auth/usuario";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
    return NextResponse.json({ erro: "E-mail ou senha inválidos." }, { status: 401 });
  }

  return NextResponse.json({ usuario: montarUsuarioSessao(data.user) });
}
