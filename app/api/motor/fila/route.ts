import { NextResponse } from "next/server";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { resolverProjetoId } from "@/lib/painel/projeto";
import { ordenarFilaUrgencia } from "@/lib/motor/urgencia";

export const runtime = "nodejs";

/**
 * Task 3.3 — Matriz de Urgência: devolve a última predição de cada entidade
 * do projeto (sob o modelo informado, ou o modelo ativo) ordenada por Score
 * de Urgência (risco × receita mensal), a fila real de priorização de CS.
 * Consumida futuramente pelo painel do Módulo 5.1 (fora do escopo aqui).
 */
export async function GET(request: Request) {
  const supabase = criarClienteSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const projetoId = await resolverProjetoId(searchParams.get("projeto_id"));

  let modeloId = searchParams.get("modelo_id");
  if (!modeloId) {
    const { data: modeloAtivo, error: erroModelo } = await supabase
      .from("modelos")
      .select("id")
      .eq("projeto_id", projetoId)
      .eq("status", "ativo")
      .maybeSingle();
    if (erroModelo) {
      return NextResponse.json({ erro: erroModelo.message }, { status: 500 });
    }
    if (!modeloAtivo) {
      return NextResponse.json(
        { erro: "Nenhum modelo ativo encontrado. Informe 'modelo_id' via query string." },
        { status: 422 }
      );
    }
    modeloId = modeloAtivo.id;
  }

  const { data: predicoes, error } = await supabase
    .from("predicoes")
    .select("id, entidade_id, pontuacao, faixa_risco, cobertura, valor_impacto, referencia_em")
    .eq("projeto_id", projetoId)
    .eq("modelo_id", modeloId)
    .order("entidade_id", { ascending: true })
    .order("referencia_em", { ascending: false });

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  const maisRecentePorEntidade = new Map<string, (typeof predicoes)[number]>();
  for (const p of predicoes ?? []) {
    if (!maisRecentePorEntidade.has(p.entidade_id)) {
      maisRecentePorEntidade.set(p.entidade_id, p);
    }
  }

  const fila = ordenarFilaUrgencia(
    Array.from(maisRecentePorEntidade.values()).map((p) => ({
      ...p,
      pontuacao: Number(p.pontuacao),
      valor_impacto: p.valor_impacto == null ? null : Number(p.valor_impacto),
    }))
  );

  return NextResponse.json({ projeto_id: projetoId, modelo_id: modeloId, fila });
}
