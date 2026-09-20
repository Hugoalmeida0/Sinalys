export function obterProjetoIdPadrao(): string {
  const projetoId = process.env.DEFAULT_PROJETO_ID;
  if (!projetoId) {
    throw new Error("Variável de ambiente DEFAULT_PROJETO_ID ausente.");
  }
  return projetoId;
}

export function obterBucketIngestao(): string {
  return process.env.SUPABASE_STORAGE_BUCKET_INGESTAO ?? "ingestao-raw";
}

export const TIPOS_DESTINO_MAPEAMENTO = [
  "id_entidade",
  "atributo_entidade",
  "inicio_entidade",
  "data_observacao",
  "metrica",
  "codigo_evento",
  "data_evento",
  "status_evento",
] as const;

export type TipoDestinoMapeamento = (typeof TIPOS_DESTINO_MAPEAMENTO)[number];

export const EXTENSOES_SUPORTADAS = [".xlsx", ".xls", ".csv"] as const;
