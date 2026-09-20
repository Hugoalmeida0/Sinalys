import { NextResponse } from "next/server";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { obterProjetoIdPadrao } from "@/lib/ingestao/constantes";
import { EntidadeNaoEncontradaError } from "@/lib/ia/analisar";
import { SemPredicaoError } from "@/lib/ia/contexto";
import { indexarCasoHistorico } from "@/lib/ia/indexar";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Feedback loop (docs/inteligencia.md §4): registra o desfecho de um cliente e
 * o vetoriza na base histórica, tornando-o recuperável pela busca lookalike da
 * Task 4.2. Backend do fluxo de feedback humano da Task 5.3 — a UI fica lá.
 *
 * Corpo: { cliente_id, acao_realizada, desfecho, projeto_id?, modelo_id?,
 *          evento_desfecho_id?, contexto_texto? }
 */
export async function POST(request: Request) {
  const supabase = criarClienteSupabaseAdmin();
  const corpo = await request.json().catch(() => ({}));

  const identificador: string | undefined = corpo?.cliente_id ?? corpo?.entidade_id;
  const acaoRealizada: string | undefined = corpo?.acao_realizada;
  const desfecho: string | undefined = corpo?.desfecho;

  if (!identificador || typeof identificador !== "string") {
    return NextResponse.json(
      { erro: "Campo 'cliente_id' é obrigatório (UUID da entidade ou id_externo)." },
      { status: 400 }
    );
  }
  if (!acaoRealizada || typeof acaoRealizada !== "string" || !acaoRealizada.trim()) {
    return NextResponse.json({ erro: "Campo 'acao_realizada' é obrigatório." }, { status: 400 });
  }
  if (desfecho !== "recuperado" && desfecho !== "cancelado") {
    return NextResponse.json(
      { erro: "Campo 'desfecho' deve ser 'recuperado' ou 'cancelado'." },
      { status: 400 }
    );
  }

  const projetoId: string = corpo?.projeto_id || obterProjetoIdPadrao();

  try {
    const resultado = await indexarCasoHistorico({
      supabase,
      projetoId,
      identificadorEntidade: identificador,
      acaoRealizada: acaoRealizada.trim(),
      desfecho,
      eventoDesfechoId: corpo?.evento_desfecho_id,
      contextoTextoManual: corpo?.contexto_texto,
      modeloId: corpo?.modelo_id,
    });

    return NextResponse.json({ projeto_id: projetoId, ...resultado }, { status: 201 });
  } catch (erro) {
    if (erro instanceof EntidadeNaoEncontradaError) {
      return NextResponse.json({ erro: (erro as Error).message }, { status: 404 });
    }
    if (erro instanceof SemPredicaoError) {
      return NextResponse.json(
        {
          erro:
            `${(erro as Error).message} ` +
            "Alternativamente, envie 'contexto_texto' para indexar um caso anterior à adoção do sistema.",
        },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { erro: `Falha ao registrar feedback: ${(erro as Error).message}` },
      { status: 500 }
    );
  }
}
