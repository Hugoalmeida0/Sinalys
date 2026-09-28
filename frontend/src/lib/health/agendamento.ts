export const PREFIXO_SOLICITACAO_AGENDAMENTO = "[Health Score] ";

export const MAX_TAMANHO_NOME_SOLICITANTE = 120;
export const MAX_TAMANHO_MENSAGEM_SOLICITACAO = 600;

export const PROXIMO_PASSO_AGENDAMENTO = "Agendar reunião de alinhamento";

export interface SolicitacaoAgendamento {
  nome: string;
  email: string | null;

  preferenciaEm: string | null;
  mensagem: string | null;
}

export function montarResumoSolicitacao(pedido: SolicitacaoAgendamento): string {
  const quem = pedido.email ? `${pedido.nome} (${pedido.email})` : pedido.nome;
  const quando = pedido.preferenciaEm
    ? ` Preferência de horário: ${new Date(pedido.preferenciaEm).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      })}.`
    : "";
  const obs = pedido.mensagem ? ` Mensagem do cliente: "${pedido.mensagem}"` : "";
  return `${PREFIXO_SOLICITACAO_AGENDAMENTO}${quem} pediu uma call de alinhamento pela página de Health Score.${quando}${obs}`;
}
