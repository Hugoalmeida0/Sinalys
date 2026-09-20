import { NextResponse } from "next/server";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { resolverProjetoId } from "@/lib/painel/projeto";
import { calcularPredicoesProjeto } from "@/lib/motor/calcular";

export const runtime = "nodejs";

/**
 * Módulo 3 — Motor Matemático (Tasks 3.1-3.3): calcula Score de Risco e
 * Score de Urgência para todas as entidades de um projeto, sob um modelo e
 * data de referência, e persiste em `predicoes`/`motivos_predicao`.
 *
 * Reutilizável pelo Vercel Cron do Módulo 5.4 (varredura diária) — basta
 * chamar sem `referencia_em` para usar o instante atual.
 */
export async function POST(request: Request) {
  const supabase = criarClienteSupabaseAdmin();
  const corpo = await request.json().catch(() => ({}));

  const projetoId = await resolverProjetoId(corpo?.projeto_id);

  let referenciaEm: Date;
  if (corpo?.referencia_em) {
    referenciaEm = new Date(corpo.referencia_em);
    if (Number.isNaN(referenciaEm.getTime())) {
      return NextResponse.json({ erro: "referencia_em inválido (use ISO 8601)." }, { status: 400 });
    }
  } else {
    referenciaEm = new Date();
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
      referencia_em: referenciaEm.toISOString(),
      total_entidades: resultado.predicoes.length,
      predicoes: resultado.predicoes,
      avisos: resultado.avisos,
    });
  } catch (erro) {
    return NextResponse.json({ erro: `Falha ao calcular predições: ${(erro as Error).message}` }, { status: 500 });
  }
}
