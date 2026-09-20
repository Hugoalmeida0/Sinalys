export type TipoOrigemIngestao = "excel" | "csv";

export interface AbaDetectada {
  aba_origem: string;
  colunas: string[];
  total_linhas: number;
}

export interface UploadIngestaoResponse {
  execucao_ingestao_id: string;
  projeto_id: string;
  tipo_origem: TipoOrigemIngestao;
  abas: AbaDetectada[];
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

export const rotuloTipoDestino: Record<TipoDestinoMapeamento, string> = {
  id_entidade: "Identificador da entidade",
  atributo_entidade: "Atributo da entidade",
  inicio_entidade: "Data de início da entidade",
  data_observacao: "Data da observação",
  metrica: "Métrica",
  codigo_evento: "Código do evento",
  data_evento: "Data do evento",
  status_evento: "Status → evento (gatilho)",
};

export const descricaoTipoDestino: Record<TipoDestinoMapeamento, string> = {
  id_entidade: "Coluna com o identificador único do cliente/objeto (obrigatória por aba).",
  atributo_entidade: "Vira um atributo livre gravado no cadastro da entidade.",
  inicio_entidade: "Data em que a entidade iniciou (ex.: início de contrato).",
  data_observacao: "Data de referência dos valores de métrica desta linha.",
  metrica: "Valor numérico, texto ou booleano acompanhado ao longo do tempo.",
  codigo_evento: "Coluna já traz o código do evento de desfecho (ex.: cancelou).",
  data_evento: "Data em que o evento ocorreu (usa a data de observação se omitida).",
  status_evento: "Um status vira evento conforme regras de-para (gatilhos).",
};

export interface DefinicaoMetrica {
  id: string;
  codigo: string;
  rotulo: string;
  tipo_valor: "numero" | "texto" | "booleano";
  unidade: string | null;
  cadencia: string | null;
  descricao: string | null;
}

export interface RelatorioProcessamento {
  linhas_lidas: number;
  entidades_criadas: number;
  entidades_atualizadas: number;
  observacoes_gravadas: number;
  eventos_gravados: number;
  erros: string[];
}

export interface ProcessarIngestaoResponse {
  execucao_ingestao_id: string;
  status: "concluido" | "falhou";
  relatorio: RelatorioProcessamento;
}

export interface MapeamentoEnvio {
  aba_origem: string;
  coluna_origem: string;
  tipo_destino: TipoDestinoMapeamento;
  campo_destino?: string | null;
  metrica_id?: string | null;
  config_transformacao?: Record<string, unknown>;
}

async function extrairErro(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  if (data && typeof data.erro === "string") return data.erro;
  return `Erro inesperado (HTTP ${res.status}).`;
}

export async function uploadArquivoIngestao(arquivo: File): Promise<UploadIngestaoResponse> {
  const formData = new FormData();
  formData.append("arquivo", arquivo);

  const res = await fetch("/api/ingestao/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error(await extrairErro(res));
  return res.json();
}

export async function listarDefinicoesMetricas(): Promise<DefinicaoMetrica[]> {
  const res = await fetch("/api/definicoes-metricas");
  if (!res.ok) throw new Error(await extrairErro(res));
  const data = await res.json();
  return data.definicoes_metricas ?? [];
}

export async function criarDefinicaoMetrica(input: {
  codigo: string;
  rotulo: string;
  tipo_valor: DefinicaoMetrica["tipo_valor"];
  unidade?: string;
  cadencia?: string;
  descricao?: string;
}): Promise<DefinicaoMetrica> {
  const res = await fetch("/api/definicoes-metricas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await extrairErro(res));
  const data = await res.json();
  return data.definicao_metrica;
}

export async function salvarMapeamentos(
  execucaoIngestaoId: string,
  mapeamentos: MapeamentoEnvio[],
): Promise<void> {
  const res = await fetch("/api/ingestao/mapeamento", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ execucao_ingestao_id: execucaoIngestaoId, mapeamentos }),
  });
  if (!res.ok) throw new Error(await extrairErro(res));
}

export async function processarIngestao(
  execucaoIngestaoId: string,
): Promise<ProcessarIngestaoResponse> {
  const res = await fetch("/api/ingestao/processar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ execucao_ingestao_id: execucaoIngestaoId }),
  });
  if (!res.ok) throw new Error(await extrairErro(res));
  return res.json();
}
