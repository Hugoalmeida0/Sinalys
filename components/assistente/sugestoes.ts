/**
 * Sugestões de pergunta por tela. O assistente recebe a tela como contexto,
 * então "este cliente" no detalhe resolve para o cliente aberto.
 */
export function sugestoesParaTela(caminho: string, clienteId?: string): string[] {
  if (clienteId) {
    return [
      `Por que o ${clienteId} está nessa faixa de risco?`,
      `Como devo agir com o ${clienteId} esta semana?`,
      `O que o histórico diz sobre casos parecidos com o ${clienteId}?`,
      `Já houve contato recente com o ${clienteId}?`,
    ];
  }
  if (caminho.startsWith("/clientes")) {
    return [
      "Quais clientes da carteira merecem atenção agora?",
      "Quem está crítico e ainda não foi contatado?",
      "Resuma a carteira por faixa de risco",
    ];
  }
  if (caminho.startsWith("/ingestao")) {
    return [
      "Como devo mapear as colunas da minha planilha?",
      "O que acontece se uma coluna ficar sem mapeamento?",
      "Quais métricas o motor de risco usa hoje?",
    ];
  }
  if (caminho.startsWith("/configuracoes")) {
    return [
      "Como devo calibrar os pesos do modelo de risco?",
      "O que significa 'cobertura' do modelo?",
      "Como a omissão de dado vira sinal de risco?",
    ];
  }
  return [
    "Por onde devo começar hoje?",
    "Quais clientes correm mais risco agora?",
    "Resuma minha carteira",
  ];
}

/** Extrai o código do cliente de rotas como "/clientes/C004". */
export function clienteDaRota(caminho: string): string | undefined {
  const m = caminho.match(/^\/clientes\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : undefined;
}

/** Rótulo humano de cada ferramenta, exibido enquanto o assistente consulta dados. */
export const ROTULOS_FERRAMENTAS: Record<string, { andamento: string; concluido: string }> = {
  listar_fila_prioridade: { andamento: "Consultando a fila de prioridade…", concluido: "Fila de prioridade consultada" },
  resumo_carteira: { andamento: "Levantando o resumo da carteira…", concluido: "Resumo da carteira consultado" },
  detalhar_cliente: { andamento: "Abrindo o raio-x do cliente…", concluido: "Raio-x do cliente consultado" },
  buscar_casos_similares: { andamento: "Buscando casos parecidos no histórico…", concluido: "Histórico de casos consultado" },
};
