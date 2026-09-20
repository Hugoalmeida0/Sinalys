import { NextResponse } from "next/server";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { resolverProjetoId } from "@/lib/painel/projeto";
import { carregarModeloAtivoDetalhado } from "@/lib/motor/modelo";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = criarClienteSupabaseAdmin();
  const { searchParams } = new URL(request.url);

  try {
    const projetoId = await resolverProjetoId(searchParams.get("projeto_id"));
    const detalhe = await carregarModeloAtivoDetalhado(supabase, projetoId);
    if (!detalhe) {
      return NextResponse.json(
        { erro: "Nenhum modelo ativo encontrado para este projeto." },
        { status: 422 }
      );
    }
    return NextResponse.json(detalhe);
  } catch (erro) {
    return NextResponse.json({ erro: (erro as Error).message }, { status: 500 });
  }
}
