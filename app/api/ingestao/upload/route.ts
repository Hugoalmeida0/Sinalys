import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { criarClienteSupabaseAdmin } from "@/lib/supabase/admin";
import { obterBucketIngestao, obterProjetoIdPadrao } from "@/lib/ingestao/constantes";
import { detectarTipoOrigem, inspecionarAbas, lerWorkbook } from "@/lib/ingestao/planilha";

// Precisa do runtime Node (Buffer, xlsx) — incompatível com o runtime Edge.
export const runtime = "nodejs";

/**
 * Task 2.1 — recebe um arquivo Excel/CSV, registra a execução de ingestão,
 * arquiva o arquivo bruto no Supabase Storage (auditoria) e devolve a lista
 * de abas/colunas detectadas para a etapa de mapeamento (Task 2.2).
 */
export async function POST(request: Request) {
  const supabase = criarClienteSupabaseAdmin();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição deve ser multipart/form-data." }, { status: 400 });
  }

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "Campo 'arquivo' é obrigatório." }, { status: 400 });
  }

  const projetoId = (formData.get("projeto_id") as string | null) || obterProjetoIdPadrao();

  let tipoOrigem: "excel" | "csv";
  try {
    tipoOrigem = detectarTipoOrigem(arquivo.name);
  } catch (erro) {
    return NextResponse.json({ erro: (erro as Error).message }, { status: 400 });
  }

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const execucaoId = randomUUID();
  const bucket = obterBucketIngestao();
  const caminhoStorage = `${projetoId}/${execucaoId}/${arquivo.name}`;

  const { error: erroUpload } = await supabase.storage
    .from(bucket)
    .upload(caminhoStorage, bytes, {
      contentType: arquivo.type || "application/octet-stream",
      upsert: false,
    });

  if (erroUpload) {
    return NextResponse.json(
      { erro: `Falha ao arquivar o arquivo original: ${erroUpload.message}` },
      { status: 500 }
    );
  }

  let abas;
  try {
    const workbook = lerWorkbook(bytes);
    abas = inspecionarAbas(workbook, tipoOrigem === "csv");
  } catch (erro) {
    await supabase.storage.from(bucket).remove([caminhoStorage]);
    return NextResponse.json(
      { erro: `Não foi possível ler o arquivo: ${(erro as Error).message}` },
      { status: 422 }
    );
  }

  const { error: erroInsert } = await supabase.from("execucoes_ingestao").insert({
    id: execucaoId,
    projeto_id: projetoId,
    tipo_origem: tipoOrigem,
    nome_origem: arquivo.name,
    status: "pendente",
    metadados: {
      tamanho_bytes: bytes.byteLength,
      mime_type: arquivo.type || null,
      storage_bucket: bucket,
      storage_path: caminhoStorage,
      abas: abas.map((a) => ({ aba_origem: a.aba_origem, total_linhas: a.total_linhas })),
    },
  });

  if (erroInsert) {
    await supabase.storage.from(bucket).remove([caminhoStorage]);
    return NextResponse.json(
      { erro: `Falha ao registrar a execução de ingestão: ${erroInsert.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      execucao_ingestao_id: execucaoId,
      projeto_id: projetoId,
      tipo_origem: tipoOrigem,
      abas,
    },
    { status: 201 }
  );
}
