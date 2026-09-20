import { NextResponse } from "next/server";
import { montarClientesPainel } from "@/lib/painel/clientes";
import { ehResposta, montarContextoRotaPainel } from "@/lib/painel/contexto-rota";
import { calcularKpisPainel } from "@/lib/painel/kpis";

export const runtime = "nodejs";

/**
 * KPIs do topo da home: receita em risco (ano), clientes em alerta / carteira,
 * antecedência média/mediana/máxima dos desfechos e clientes contatados em 7d.
 */
export async function GET(request: Request) {
  const contexto = await montarContextoRotaPainel(request);
  if (ehResposta(contexto)) return contexto;

  try {
    const { clientes } = await montarClientesPainel(contexto);
    const kpis = await calcularKpisPainel({ ...contexto, clientes });
    return NextResponse.json({
      projeto_id: contexto.projetoId,
      modelo_id: contexto.modeloId,
      kpis,
    });
  } catch (erro) {
    return NextResponse.json({ erro: (erro as Error).message }, { status: 500 });
  }
}
