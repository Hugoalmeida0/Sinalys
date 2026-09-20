import { NextResponse } from "next/server";
import { montarClientesPainel } from "@/lib/painel/clientes";
import { ehResposta, montarContextoRotaPainel } from "@/lib/painel/contexto-rota";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const contexto = await montarContextoRotaPainel(request);
  if (ehResposta(contexto)) return contexto;

  try {
    const { clientes, semPredicao } = await montarClientesPainel(contexto);
    clientes.sort((a, b) => b.scoreRisco - a.scoreRisco);

    const ordem = ["critico", "alerta", "atencao", "saudavel"] as const;
    const resumoCarteira = ordem.map((faixa) => {
      const total = clientes.filter((c) => c.faixaRisco === faixa).length;
      return {
        faixa,
        total,
        percentual: clientes.length ? Math.round((total / clientes.length) * 100) : 0,
      };
    });

    return NextResponse.json({
      projeto_id: contexto.projetoId,
      modelo_id: contexto.modeloId,
      sem_predicao: semPredicao,
      resumo_carteira: resumoCarteira,
      clientes,
    });
  } catch (erro) {
    return NextResponse.json({ erro: (erro as Error).message }, { status: 500 });
  }
}
