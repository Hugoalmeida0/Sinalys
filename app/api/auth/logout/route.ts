import { NextResponse } from "next/server";
import { criarClienteSupabaseServidor } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await criarClienteSupabaseServidor();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
