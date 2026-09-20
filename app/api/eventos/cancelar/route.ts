import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { resolverProjetoId } from "@/lib/painel/projeto";
import { resolverEntidade, EntidadeNaoEncontradaError } from "@/lib/ia/contexto";
import { indexarCasoHistorico } from "@/lib/ia/indexar";
import { CODIGOS_MOTIVO_CANCELAMENTO } from "@/lib/cancelamento/constantes";

export const runtime = "nodejs";

/**
 * Fecha o loop com o cliente final: registra o desfecho de cancelamento com
 * motivo estruturado (docs/inteligencia.md §4 + analytics de causa-raiz), em
 * vez de só saber "que" o cliente cancelou. Espelha `POST
 * /api/inteligencia/feedback`, mas cria a linha de `eventos_desfecho` — hoje
 * só a ingestão de planilha faz isso.
 *
 * Corpo: { cliente_id, motivo_categoria, motivo_detalhe?, acao_realizada?, projeto_id? }
 * `acao_realizada` é opcional: quando informada, o caso também é vetorizado
 * no histórico lookalike (mesmo fluxo de "Marcar como recuperado").
 */
export async function POST(request: Request) {
  const supabase = criarClienteSupabaseAdmin();
  const corpo = await request.json().catch(() => ({}));

  const identificador: string | undefined = corpo?.cliente_id ?? corpo?.entidade_id;
  const motivoCategoria: string | undefined = corpo?.motivo_categoria;
  const motivoDetalhe: string | null = typeof corpo?.motivo_detalhe === "string" ? corpo.motivo_detalhe.trim() || null : null;
  const acaoRealizada: string | undefined = corpo?.acao_realizada;

  if (!identificador || typeof identificador !== "string") {
    return NextResponse.json(
      { erro: "Campo 'cliente_id' é obrigatório (UUID da entidade ou id_externo)." },
      { status: 400 }
    );
  }
  if (
    !motivoCategoria ||
    !CODIGOS_MOTIVO_CANCELAMENTO.includes(motivoCategoria as (typeof CODIGOS_MOTIVO_CANCELAMENTO)[number])
  ) {
    return NextResponse.json(
      {
        erro: `Campo 'motivo_categoria' é obrigatório e deve ser um de: ${CODIGOS_MOTIVO_CANCELAMENTO.join(", ")}.`,
      },
      { status: 400 }
    );
  }

  const projetoId = await resolverProjetoId(corpo?.projeto_id);

  try {
    const entidade = await resolverEntidade(supabase, projetoId, identificador);
    if (!entidade) {
      throw new EntidadeNaoEncontradaError(
        `Nenhuma entidade com identificador "${identificador}" no projeto ${projetoId}.`
      );
    }

    const { data: projeto, error: erroProjeto } = await supabase
      .from("projetos")
      .select("codigo_evento_alvo")
      .eq("id", projetoId)
      .maybeSingle();
    if (erroProjeto) throw new Error(`Falha ao buscar projeto: ${erroProjeto.message}`);
    if (!projeto) throw new Error(`Projeto ${projetoId} não encontrado.`);

    const eventoId = randomUUID();
    const agora = new Date().toISOString();

    const { error: erroInsert } = await supabase.from("eventos_desfecho").insert({
      id: eventoId,
      projeto_id: projetoId,
      entidade_id: entidade.id,
      codigo_evento: projeto.codigo_evento_alvo,
      ocorrido_em: agora,
      motivo_categoria: motivoCategoria,
      motivo_detalhe: motivoDetalhe,
    });
    if (erroInsert) throw new Error(`Falha ao registrar cancelamento: ${erroInsert.message}`);

    // Se o analista descreveu o que foi tentado antes do cancelamento, o caso
    // também alimenta a busca lookalike — o mesmo padrão de "o que foi feito
    // não foi suficiente" ajuda a IA a não repetir a recomendação com o
    // próximo cliente parecido.
    let indexado = false;
    if (acaoRealizada?.trim()) {
      try {
        await indexarCasoHistorico({
          supabase,
          projetoId,
          identificadorEntidade: identificador,
          acaoRealizada: acaoRealizada.trim(),
          desfecho: "cancelado",
          eventoDesfechoId: eventoId,
        });
        indexado = true;
      } catch {
        // Sem predição para essa entidade é um caso legítimo (cliente sem
        // motor calculado) — o cancelamento já foi registrado, então não
        // falha a rota inteira por causa da indexação vetorial opcional.
      }
    }

    return NextResponse.json(
      { projeto_id: projetoId, evento_desfecho_id: eventoId, indexado_no_historico: indexado },
      { status: 201 }
    );
  } catch (erro) {
    if (erro instanceof EntidadeNaoEncontradaError) {
      return NextResponse.json({ erro: (erro as Error).message }, { status: 404 });
    }
    return NextResponse.json(
      { erro: `Falha ao registrar cancelamento: ${(erro as Error).message}` },
      { status: 500 }
    );
  }
}
