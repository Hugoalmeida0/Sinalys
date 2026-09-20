import { NextResponse } from "next/server";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { resolverModeloAtivoId, resolverProjetoId } from "@/lib/painel/projeto";
import { calcularPredicoesProjeto } from "@/lib/motor/calcular";
import {
  atualizarPesosRegras,
  carregarModeloAtivoDetalhado,
  criarRegraModelo,
  RegraInvalidaError,
} from "@/lib/motor/modelo";
import type { DirecaoRisco, TipoRegra } from "@/lib/motor/tipos";

export const runtime = "nodejs";
// Recalcula o motor logo após salvar (ver comentário abaixo) — mesmo teto de
// tempo da rota de recálculo manual.
export const maxDuration = 60;

/**
 * Depois de qualquer alteração no modelo, recalcula o motor de risco na
 * hora: diferente do recálculo automático do login (que não deve bloquear a
 * navegação), aqui é uma ação explícita de "Salvar" — o analista espera ver o
 * efeito da mudança de peso imediatamente, e vale a espera de alguns segundos.
 */
async function recalcularEDevolverModelo(params: {
  supabase: ReturnType<typeof criarClienteSupabaseAdmin>;
  projetoId: string;
  modeloId: string;
}) {
  const { supabase, projetoId, modeloId } = params;
  const resultado = await calcularPredicoesProjeto({
    supabase,
    projetoId,
    modeloId,
  });
  const detalhe = await carregarModeloAtivoDetalhado(supabase, projetoId);
  return { ...detalhe, recalculo: { total_entidades: resultado.predicoes.length, avisos: resultado.avisos } };
}

async function resolverProjetoEModelo(request: Request, corpo: Record<string, unknown>) {
  const supabase = criarClienteSupabaseAdmin();
  const projetoId = await resolverProjetoId((corpo.projeto_id as string) ?? null);
  const modeloId = await resolverModeloAtivoId(supabase, projetoId);
  if (!modeloId) {
    throw new NoModeloAtivoError();
  }
  return { supabase, projetoId, modeloId };
}

class NoModeloAtivoError extends Error {}

/** Body: `{ atualizacoes: [{ id, peso }] }` — atualiza pesos de regras existentes. */
export async function PATCH(request: Request) {
  const corpo = await request.json().catch(() => ({}));
  const atualizacoes = corpo?.atualizacoes;

  if (!Array.isArray(atualizacoes) || atualizacoes.length === 0) {
    return NextResponse.json({ erro: "Campo 'atualizacoes' é obrigatório e não pode ser vazio." }, { status: 400 });
  }
  for (const a of atualizacoes) {
    if (typeof a?.id !== "string" || typeof a?.peso !== "number") {
      return NextResponse.json(
        { erro: "Cada item de 'atualizacoes' precisa de 'id' (string) e 'peso' (número)." },
        { status: 400 }
      );
    }
  }

  try {
    const { supabase, projetoId, modeloId } = await resolverProjetoEModelo(request, corpo);
    await atualizarPesosRegras({ supabase, projetoId, modeloId, atualizacoes });
    const detalhe = await recalcularEDevolverModelo({ supabase, projetoId, modeloId });
    return NextResponse.json(detalhe);
  } catch (erro) {
    return responderErro(erro);
  }
}

/** Body: `{ metrica_id, tipo, direcao, peso, janela_dias?, janela_observacoes?, pontuacao_omissao? }` — cria uma regra nova. */
export async function POST(request: Request) {
  const corpo = await request.json().catch(() => ({}));

  const metricaId: unknown = corpo?.metrica_id;
  const tipo: unknown = corpo?.tipo;
  const direcao: unknown = corpo?.direcao;
  const peso: unknown = corpo?.peso;
  const janelaDias: unknown = corpo?.janela_dias;
  const janelaObservacoes: unknown = corpo?.janela_observacoes;
  const pontuacaoOmissao: unknown = corpo?.pontuacao_omissao;

  if (typeof metricaId !== "string" || !metricaId) {
    return NextResponse.json({ erro: "Campo 'metrica_id' é obrigatório." }, { status: 400 });
  }
  if (typeof tipo !== "string" || typeof direcao !== "string" || typeof peso !== "number") {
    return NextResponse.json(
      { erro: "Campos 'tipo' (string), 'direcao' (string) e 'peso' (número) são obrigatórios." },
      { status: 400 }
    );
  }

  try {
    const { supabase, projetoId, modeloId } = await resolverProjetoEModelo(request, corpo);
    await criarRegraModelo({
      supabase,
      projetoId,
      modeloId,
      metricaId,
      tipo: tipo as TipoRegra,
      direcao: direcao as DirecaoRisco,
      peso,
      janelaDias: typeof janelaDias === "number" ? janelaDias : undefined,
      janelaObservacoes: typeof janelaObservacoes === "number" ? janelaObservacoes : undefined,
      pontuacaoOmissao: typeof pontuacaoOmissao === "number" ? pontuacaoOmissao : undefined,
    });
    const detalhe = await recalcularEDevolverModelo({ supabase, projetoId, modeloId });
    return NextResponse.json(detalhe, { status: 201 });
  } catch (erro) {
    return responderErro(erro);
  }
}

function responderErro(erro: unknown) {
  if (erro instanceof NoModeloAtivoError) {
    return NextResponse.json({ erro: "Nenhum modelo ativo encontrado para este projeto." }, { status: 422 });
  }
  if (erro instanceof RegraInvalidaError) {
    return NextResponse.json({ erro: erro.message }, { status: 400 });
  }
  return NextResponse.json({ erro: (erro as Error).message }, { status: 500 });
}
