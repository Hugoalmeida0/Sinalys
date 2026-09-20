import { NextResponse } from "next/server";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { lerWorkbook } from "@/lib/ingestao/planilha";
import { processarMapeamentos } from "@/lib/ingestao/normalizar";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = criarClienteSupabaseAdmin();
  const corpo = await request.json().catch(() => null);
  const execucaoIngestaoId: string | undefined = corpo?.execucao_ingestao_id;

  if (!execucaoIngestaoId) {
    return NextResponse.json({ erro: "execucao_ingestao_id é obrigatório." }, { status: 400 });
  }

  const { data: execucao, error: erroExecucao } = await supabase
    .from("execucoes_ingestao")
    .select("id, projeto_id, tipo_origem, status, metadados")
    .eq("id", execucaoIngestaoId)
    .maybeSingle();

  if (erroExecucao) {
    return NextResponse.json({ erro: erroExecucao.message }, { status: 500 });
  }
  if (!execucao) {
    return NextResponse.json({ erro: "execucao_ingestao_id não encontrado." }, { status: 404 });
  }
  if (execucao.status === "processando") {
    return NextResponse.json({ erro: "Esta execução já está sendo processada." }, { status: 409 });
  }

  const { data: mapeamentos, error: erroMapeamentos } = await supabase
    .from("mapeamentos_importacao")
    .select("id, aba_origem, coluna_origem, tipo_destino, campo_destino, metrica_id, config_transformacao")
    .eq("execucao_ingestao_id", execucaoIngestaoId);

  if (erroMapeamentos) {
    return NextResponse.json({ erro: erroMapeamentos.message }, { status: 500 });
  }
  if (!mapeamentos || mapeamentos.length === 0) {
    return NextResponse.json(
      { erro: "Nenhum mapeamento De-Para definido para esta execução (Task 2.2)." },
      { status: 422 }
    );
  }

  const metricaIds = Array.from(
    new Set(mapeamentos.filter((m) => m.metrica_id).map((m) => m.metrica_id as string))
  );
  const { data: definicoesMetricas, error: erroDefinicoes } =
    metricaIds.length > 0
      ? await supabase.from("definicoes_metricas").select("id, codigo, tipo_valor").in("id", metricaIds)
      : { data: [], error: null };

  if (erroDefinicoes) {
    return NextResponse.json({ erro: erroDefinicoes.message }, { status: 500 });
  }

  const metadados = (execucao.metadados ?? {}) as {
    storage_bucket?: string;
    storage_path?: string;
  };
  if (!metadados.storage_bucket || !metadados.storage_path) {
    return NextResponse.json(
      { erro: "Execução sem arquivo bruto arquivado (metadados.storage_path ausente)." },
      { status: 422 }
    );
  }

  await supabase.from("execucoes_ingestao").update({ status: "processando" }).eq("id", execucaoIngestaoId);

  const { data: arquivo, error: erroDownload } = await supabase.storage
    .from(metadados.storage_bucket)
    .download(metadados.storage_path);

  if (erroDownload || !arquivo) {
    await supabase
      .from("execucoes_ingestao")
      .update({
        status: "falhou",
        detalhes_erro: { mensagem: `Falha ao baixar arquivo do storage: ${erroDownload?.message}` },
      })
      .eq("id", execucaoIngestaoId);
    return NextResponse.json({ erro: "Falha ao baixar o arquivo original do storage." }, { status: 500 });
  }

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const isCsv = execucao.tipo_origem === "csv";

  try {
    const workbook = lerWorkbook(bytes);
    const relatorio = await processarMapeamentos({
      supabase,
      projetoId: execucao.projeto_id,
      execucaoIngestaoId,
      workbook,
      isCsv,
      mapeamentos,
      definicoesMetricas: definicoesMetricas ?? [],
    });

    const statusFinal = relatorio.erros.length > 0 && relatorio.observacoes_gravadas === 0 ? "falhou" : "concluido";

    await supabase
      .from("execucoes_ingestao")
      .update({
        status: statusFinal,
        concluido_em: new Date().toISOString(),
        detalhes_erro: relatorio.erros.length > 0 ? { erros: relatorio.erros } : null,
      })
      .eq("id", execucaoIngestaoId);

    return NextResponse.json({ execucao_ingestao_id: execucaoIngestaoId, status: statusFinal, relatorio });
  } catch (erro) {
    await supabase
      .from("execucoes_ingestao")
      .update({
        status: "falhou",
        detalhes_erro: { mensagem: (erro as Error).message },
      })
      .eq("id", execucaoIngestaoId);
    return NextResponse.json({ erro: `Falha ao processar: ${(erro as Error).message}` }, { status: 500 });
  }
}
