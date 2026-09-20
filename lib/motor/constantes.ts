/**
 * Código reservado de `definicoes_metricas.codigo` usado para resolver o
 * impacto financeiro (receita mensal) de cada entidade na Matriz de Urgência
 * (Task 3.3, ver docs/motor-matematico.md §4). O usuário deve mapear uma
 * coluna com este código durante a ingestão (Task 2.2) para que o motor
 * calcule o Score de Prioridade.
 */
export const CODIGO_METRICA_RECEITA_MENSAL = "receita_mensal";

/** Janela padrão (dias) da média móvel quando a regra não especifica `janela_dias`. */
export const PADRAO_JANELA_MEDIA_MOVEL_DIAS = 30;

/**
 * Quantas observações mais recentes o `zscore_carteira` agrega (média) antes
 * de comparar com a carteira, quando a regra não especifica
 * `janela_observacoes`. Evita que um único período atípico — um percentual
 * calculado sobre 1 chamado, um mês de atraso isolado — sature o sinal
 * sozinho (TASKS-ATUALIZACAO Task G.6 / transformação "nível" da C.3).
 */
export const PADRAO_JANELA_OBSERVACOES = 3;

/**
 * Omissão (entidade sem nenhuma observação da métrica) não tem pontuação
 * global: só pontua quando a regra define `pontuacao_omissao` explicitamente
 * (ex. silêncio em pesquisa = distanciamento). Sem isso a regra fica "não
 * avaliável" e reduz a cobertura — um cliente sem chamado no mês não é um
 * cliente em risco (Task A.5).
 */
export const OMISSAO_SEM_PONTUACAO = null;

/** Limite de desvios-padrão (|z|) usado para saturar a normalização em 100. */
export const PADRAO_CLIP_Z = 3;

/**
 * Desvio mínimo (em desvios-padrão) para uma regra contar como "acionada" —
 * o que aparece como sinal/evidência para o analista. Abaixo disso o valor
 * normalizado ainda entra no score, mas não vira alerta: estar 0,1σ acima da
 * média da carteira não é um sinal (Task D.2).
 */
export const LIMIAR_Z_ACIONADO = 1;
