/** Categorias estruturadas de motivo de cancelamento (eventos_desfecho.motivo_categoria). */
export const MOTIVOS_CANCELAMENTO = {
  preco: "Preço",
  suporte: "Suporte",
  produto: "Produto",
  concorrencia: "Concorrência",
  financeiro: "Financeiro do cliente",
  outro: "Outro",
} as const;

export type MotivoCancelamento = keyof typeof MOTIVOS_CANCELAMENTO;

export const CODIGOS_MOTIVO_CANCELAMENTO = Object.keys(
  MOTIVOS_CANCELAMENTO
) as MotivoCancelamento[];
