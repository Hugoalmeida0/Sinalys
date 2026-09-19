import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { obterProjetoIdPadrao } from "@/lib/ingestao/constantes";

export const runtime = "nodejs";

const TIPOS_VALOR = ["numero", "texto", "booleano"] as const;

/** Lista as definições de métricas de um projeto (usado pela etapa de mapeamento). */
export async function GET(request: Request) {
  const supabase = criarClienteSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const projetoId = searchParams.get("projeto_id") || obterProjetoIdPadrao();

  const { data, error } = await supabase
    .from("definicoes_metricas")
    .select("id, codigo, rotulo, tipo_valor, unidade, cadencia, descricao")
    .eq("projeto_id", projetoId)
    .order("rotulo");

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }
  return NextResponse.json({ definicoes_metricas: data });
}

/**
 * Cria uma nova definição de métrica sob demanda — necessário porque o
 * mapeamento De-Para (Task 2.2) permite associar uma coluna arbitrária a uma
 * métrica customizada que ainda não existe no projeto.
 */
export async function POST(request: Request) {
  const supabase = criarClienteSupabaseAdmin();
  const corpo = await request.json().catch(() => null);

  if (!corpo || typeof corpo.codigo !== "string" || typeof corpo.rotulo !== "string") {
    return NextResponse.json({ erro: "Campos 'codigo' e 'rotulo' são obrigatórios." }, { status: 400 });
  }
  if (!TIPOS_VALOR.includes(corpo.tipo_valor)) {
    return NextResponse.json(
      { erro: `tipo_valor deve ser um de: ${TIPOS_VALOR.join(", ")}.` },
      { status: 400 }
    );
  }

  const projetoId = corpo.projeto_id || obterProjetoIdPadrao();

  const { data, error } = await supabase
    .from("definicoes_metricas")
    .upsert(
      {
        id: randomUUID(),
        projeto_id: projetoId,
        codigo: corpo.codigo,
        rotulo: corpo.rotulo,
        tipo_valor: corpo.tipo_valor,
        unidade: corpo.unidade ?? null,
        cadencia: corpo.cadencia ?? null,
        descricao: corpo.descricao ?? null,
      },
      { onConflict: "projeto_id,codigo", ignoreDuplicates: false }
    )
    .select("id, codigo, rotulo, tipo_valor, unidade, cadencia, descricao")
    .single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }
  return NextResponse.json({ definicao_metrica: data }, { status: 201 });
}
