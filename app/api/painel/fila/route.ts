import { NextResponse } from "next/server";
import type { FaixaRisco } from "@/lib/mock-data";
import { FAIXAS_FILA_PADRAO, montarClientesPainel, montarFilaDoDia } from "@/lib/painel/clientes";
import { ehResposta, montarContextoRotaPainel } from "@/lib/painel/contexto-rota";

export const runtime = "nodejs";

const FAIXAS_VALIDAS = new Set<string>(["critico", "alerta", "atencao", "saudavel"]);

/**
 * Task 5.1 — "Sua fila do dia": clientes em crítico/alerta (por padrão),
 * sem silenciamento vigente, ordenados por Score de Urgência, já na forma que
 * `components/dashboard/FilaDoDia.tsx` consome.
 *
 * Query: `faixas=critico,alerta|todas`, `incluir_silenciados=1`, `segmento=`,
 *        `projeto_id=`, `modelo_id=`.
 */
export async function GET(request: Request) {
  const contexto = await montarContextoRotaPainel(request);
  if (ehResposta(contexto)) return contexto;

  const { searchParams } = new URL(request.url);
  const faixasParam = searchParams.get("faixas");
  const faixas =
    faixasParam === "todas"
      ? (Array.from(FAIXAS_VALIDAS) as FaixaRisco[])
      : faixasParam
        ? (faixasParam.split(",").filter((f) => FAIXAS_VALIDAS.has(f)) as FaixaRisco[])
        : FAIXAS_FILA_PADRAO;
  const incluirSilenciados = searchParams.get("incluir_silenciados") === "1";
  const segmento = searchParams.get("segmento");

  try {
    const { clientes, semPredicao } = await montarClientesPainel(contexto);
    let fila = montarFilaDoDia(clientes, { faixas, incluirSilenciados });
    if (segmento) fila = fila.filter((c) => c.segmento === segmento);

    return NextResponse.json({
      projeto_id: contexto.projetoId,
      modelo_id: contexto.modeloId,
      segmentos: Array.from(new Set(clientes.map((c) => c.segmento).filter(Boolean))).sort(),
      total_carteira: clientes.length,
      sem_predicao: semPredicao,
      fila,
    });
  } catch (erro) {
    return NextResponse.json({ erro: (erro as Error).message }, { status: 500 });
  }
}
