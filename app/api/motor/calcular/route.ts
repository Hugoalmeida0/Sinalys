import { NextResponse } from "next/server";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { resolverProjetoId } from "@/lib/painel/projeto";
import { calcularPredicoesProjeto } from "@/lib/motor/calcular";

export const runtime = "nodejs";
// Chamado a cada login (Módulo 5); dataset real (~80 entidades) mede ~5s após
// o lote de persistência, mas o default de 10s do plano Hobby é curto demais.
export const maxDuration = 60;

/**
 * Módulo 3 — Motor Matemático (Tasks 3.1-3.3): calcula Score de Risco e
 * impacto financeiro para todas as entidades de um projeto, sob um modelo e
 * data de referência, e persiste em `predicoes`/`motivos_predicao`.
 *
 * Sem `referencia_em` a referência é a última observação do projeto (Task
 * A.1) — não "agora", que com dados mensais deixaria a janela recente vazia.
 * Reutilizável pelo Vercel Cron do Módulo 5.4 e pelo backfill mensal (B.5).
 */
export async function POST(request: Request) {
  const supabase = criarClienteSupabaseAdmin();
  const corpo = await request.json().catch(() => ({}));

  const projetoId = await resolverProjetoId(corpo?.projeto_id);

  let referenciaEm: Date | undefined;
  if (corpo?.referencia_em) {
    referenciaEm = new Date(corpo.referencia_em);
    if (Number.isNaN(referenciaEm.getTime())) {
      return NextResponse.json({ erro: "referencia_em inválido (use ISO 8601)." }, { status: 400 });
    }
  }

  let modeloId: string | undefined = corpo?.modelo_id;
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
        {
          erro:
            "Nenhum modelo ativo encontrado para o projeto. Informe 'modelo_id' explicitamente ou ative um modelo (status='ativo') em regras_modelo.",
        },
        { status: 422 }
      );
    }
    modeloId = modeloAtivo.id as string;
  }

  try {
    const resultado = await calcularPredicoesProjeto({
      supabase,
      projetoId,
      modeloId,
      referenciaEm,
    });

    return NextResponse.json({
      projeto_id: projetoId,
      modelo_id: modeloId,
      referencia_em: resultado.referenciaEm.toISOString(),
      total_entidades: resultado.predicoes.length,
      predicoes: resultado.predicoes,
      avisos: resultado.avisos,
    });
  } catch (erro) {
    return NextResponse.json({ erro: `Falha ao calcular predições: ${(erro as Error).message}` }, { status: 500 });
  }
}
