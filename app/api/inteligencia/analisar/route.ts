import { NextResponse } from "next/server";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { resolverProjetoId } from "@/lib/painel/projeto";
import { analisarRiscoEntidade, EntidadeNaoEncontradaError } from "@/lib/ia/analisar";
import { SemPredicaoError } from "@/lib/ia/contexto";

export const runtime = "nodejs";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = criarClienteSupabaseAdmin();
  const corpo = await request.json().catch(() => ({}));

  const identificador: string | undefined = corpo?.cliente_id ?? corpo?.entidade_id;
  if (!identificador || typeof identificador !== "string") {
    return NextResponse.json(
      { erro: "Campo 'cliente_id' é obrigatório (UUID da entidade ou id_externo)." },
      { status: 400 }
    );
  }

  const gatilho = corpo?.trigger_source === "cron" ? "cron" : "manual";
  const projetoId = await resolverProjetoId(corpo?.projeto_id);

  try {
    const resultado = await analisarRiscoEntidade({
      supabase,
      projetoId,
      identificadorEntidade: identificador,
      modeloId: corpo?.modelo_id,
      origemGatilho: gatilho,
      persistir: corpo?.persistir !== false,
      forcar: corpo?.forcar === true,
    });

    return NextResponse.json({
      projeto_id: projetoId,
      diagnostico_id: resultado.diagnostico_id,
      modelo_ia: resultado.modelo_ia,
      modelo_embedding: resultado.modelo_embedding,
      contexto: resultado.contexto,
      casos_similares: resultado.casos_similares,
      origem: resultado.origem,
      ...resultado.diagnostico,
    });
  } catch (erro) {
    if (erro instanceof EntidadeNaoEncontradaError) {
      return NextResponse.json({ erro: (erro as Error).message }, { status: 404 });
    }
    if (erro instanceof SemPredicaoError) {
      return NextResponse.json({ erro: (erro as Error).message }, { status: 422 });
    }
    return NextResponse.json(
      { erro: `Falha ao gerar diagnóstico: ${(erro as Error).message}` },
      { status: 500 }
    );
  }
}
