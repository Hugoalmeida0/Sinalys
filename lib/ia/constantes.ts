/**
 * Módulo 4 — Inteligência, RAG e Orquestração de IA.
 *
 * Os modelos citados em `docs/instructions.md` (`gemini-1.5-flash` e
 * `text-embedding-004`) foram retirados da API do Google e não respondem mais.
 * Os substitutos abaixo foram verificados contra a chave real do projeto.
 */

/**
 * Modelo de geração usado no diagnóstico/plano de ação (Tasks 4.1 e 4.3).
 * Sobrescrevível por env var para trocar de modelo sem alterar código — útil
 * porque a escolha não pôde ser comparada empiricamente (ver TASKS.md/Módulo 4:
 * a chave do projeto está com cota zero em `generateContent`).
 */
export function obterModeloLlm(): string {
  return process.env.GEMINI_MODELO_LLM ?? "gemini-2.5-flash";
}

/**
 * Modelo de embeddings usado na indexação e na busca lookalike (Task 4.2).
 *
 * ATENÇÃO: trocar este valor invalida silenciosamente todos os vetores já
 * gravados em `casos_historicos_embeddings` — embeddings de modelos diferentes
 * não são comparáveis entre si. Uma troca exige reindexar a base inteira.
 */
export function obterModeloEmbedding(): string {
  return process.env.GEMINI_MODELO_EMBEDDING ?? "gemini-embedding-001";
}

/**
 * Dimensão dos vetores gravados. Fixada pela coluna `vector(768)` de
 * `casos_historicos_embeddings`; o modelo é nativamente 3072-D e é truncado via
 * `outputDimensionality`. Mudar aqui exige migration na coluna e no índice.
 */
export const DIMENSAO_EMBEDDING = 768;

/**
 * `SEMANTIC_SIMILARITY` (e não o par RETRIEVAL_QUERY/RETRIEVAL_DOCUMENT) porque
 * a busca aqui é simétrica: comparamos o perfil de um cliente contra perfis de
 * outros clientes, não uma pergunta curta contra documentos longos.
 */
export const TIPO_TAREFA_EMBEDDING = "SEMANTIC_SIMILARITY";

/** Quantidade de casos históricos similares injetados no prompt (docs/instructions.md §1). */
export const PADRAO_LIMITE_LOOKALIKE = 3;

/**
 * Piso de similaridade de cosseno para um caso entrar no contexto. Casos muito
 * distantes só adicionariam ruído ao prompt e induziriam comparações falsas.
 */
export const PADRAO_SIMILARIDADE_MINIMA = 0.5;
