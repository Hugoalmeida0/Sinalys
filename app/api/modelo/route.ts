import { NextResponse } from "next/server";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { resolverProjetoId } from "@/lib/painel/projeto";
import { carregarModeloAtivoDetalhado } from "@/lib/motor/modelo";

export const runtime = "nodejs";

/**
 * Módulo 5 (CRUD do modelo de risco) — devolve o modelo ativo do projeto com
 * suas regras rotuladas (métrica, tipo, direção, peso) e as métricas numéricas
 * ainda sem regra, para a aba "Modelo de risco" em /configuracoes.
 */
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
