/**
 * Código reservado de `definicoes_metricas.codigo` usado para resolver o
 * impacto financeiro (receita mensal) de cada entidade na Matriz de Urgência
 * (Task 3.3, ver docs/motor-matematico.md §4). O usuário deve mapear uma
 * coluna com este código durante a ingestão (Task 2.2) para que o motor
 * calcule o Score de Urgência.
 */
export const CODIGO_METRICA_RECEITA_MENSAL = "receita_mensal";

/** Janela padrão (dias) da média móvel quando a regra não especifica `janela_dias`. */
export const PADRAO_JANELA_MEDIA_MOVEL_DIAS = 30;

/**
 * Pontuação (0-100) atribuída quando uma métrica está ausente para a entidade
 * (omissão como sinal de risco — docs/motor-matematico.md §1, "Null como
 * Comportamento"), usada quando a regra não especifica `pontuacao_omissao`.
 */
export const PADRAO_PONTUACAO_OMISSAO = 70;

/** Limite de desvios-padrão (|z|) usado para saturar a normalização em 100. */
export const PADRAO_CLIP_Z = 3;
