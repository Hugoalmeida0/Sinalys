import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { TIPOS_DESTINO_MAPEAMENTO, obterProjetoIdPadrao } from "@/lib/ingestao/constantes";

export const runtime = "nodejs";

interface MapeamentoEntrada {
  aba_origem?: string;
  coluna_origem: string;
  tipo_destino: string;
  campo_destino?: string | null;
  metrica_id?: string | null;
  config_transformacao?: Record<string, unknown>;
}

function validarMapeamento(m: MapeamentoEntrada): string | null {
  if (!m.coluna_origem) return "coluna_origem é obrigatório.";
  if (!TIPOS_DESTINO_MAPEAMENTO.includes(m.tipo_destino as never)) {
    return `tipo_destino "${m.tipo_destino}" inválido. Use um de: ${TIPOS_DESTINO_MAPEAMENTO.join(", ")}.`;
  }
  if (m.tipo_destino === "metrica" && !m.metrica_id) {
    return `coluna "${m.coluna_origem}": metrica_id é obrigatório quando tipo_destino = 'metrica'.`;
  }
  if (m.tipo_destino !== "metrica" && m.metrica_id) {
    return `coluna "${m.coluna_origem}": metrica_id só pode ser informado quando tipo_destino = 'metrica'.`;
  }
  return null;
}

export async function GET(request: Request) {
  const supabase = criarClienteSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const execucaoIngestaoId = searchParams.get("execucao_ingestao_id");

  if (!execucaoIngestaoId) {
    return NextResponse.json({ erro: "Parâmetro execucao_ingestao_id é obrigatório." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("mapeamentos_importacao")
    .select(
      "id, aba_origem, coluna_origem, tipo_destino, campo_destino, metrica_id, config_transformacao, definicoes_metricas(codigo, rotulo)"
    )
    .eq("execucao_ingestao_id", execucaoIngestaoId);

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }
  return NextResponse.json({ mapeamentos: data });
}

export async function POST(request: Request) {
  const supabase = criarClienteSupabaseAdmin();
  const corpo = await request.json().catch(() => null);

  const execucaoIngestaoId: string | undefined = corpo?.execucao_ingestao_id;
  const mapeamentos: MapeamentoEntrada[] | undefined = corpo?.mapeamentos;

  if (!execucaoIngestaoId || !Array.isArray(mapeamentos) || mapeamentos.length === 0) {
    return NextResponse.json(
      { erro: "execucao_ingestao_id e um array 'mapeamentos' não vazio são obrigatórios." },
      { status: 400 }
    );
  }

  const { data: execucao, error: erroExecucao } = await supabase
    .from("execucoes_ingestao")
    .select("id, projeto_id, status")
    .eq("id", execucaoIngestaoId)
    .maybeSingle();

  if (erroExecucao) {
    return NextResponse.json({ erro: erroExecucao.message }, { status: 500 });
  }
  if (!execucao) {
    return NextResponse.json({ erro: "execucao_ingestao_id não encontrado." }, { status: 404 });
  }

  for (const m of mapeamentos) {
    const erroValidacao = validarMapeamento(m);
    if (erroValidacao) {
      return NextResponse.json({ erro: erroValidacao }, { status: 400 });
    }
  }

  const projetoId = corpo?.projeto_id || execucao.projeto_id || obterProjetoIdPadrao();

  const linhas = mapeamentos.map((m) => ({
    id: randomUUID(),
    projeto_id: projetoId,
    execucao_ingestao_id: execucaoIngestaoId,
    aba_origem: m.aba_origem ?? "",
    coluna_origem: m.coluna_origem,
    tipo_destino: m.tipo_destino,
    campo_destino: m.campo_destino ?? null,
    metrica_id: m.tipo_destino === "metrica" ? m.metrica_id : null,
    config_transformacao: m.config_transformacao ?? {},
  }));

  const { data, error } = await supabase
    .from("mapeamentos_importacao")
    .upsert(linhas, { onConflict: "execucao_ingestao_id,aba_origem,coluna_origem" })
    .select("id, aba_origem, coluna_origem, tipo_destino, campo_destino, metrica_id");

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ mapeamentos: data }, { status: 201 });
}
