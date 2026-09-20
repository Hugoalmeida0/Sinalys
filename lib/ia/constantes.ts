/**
 * Módulo 4 — Inteligência, RAG e Orquestração de IA.
 *
 * Arquitetura híbrida de provedores (decisão do usuário, ver TASKS.md/Módulo 4):
 * - Geração (LLM): OpenRouter, com um modelo do tier gratuito. A chave Gemini
 *   do projeto está com cota zero em `generateContent`.
 * - Embeddings: Google Gemini, que funciona na chave atual, é gratuito e já
 *   indexou a base vetorial. A OpenRouter não oferece embedding gratuito.
 *
 * Os modelos citados em `docs/instructions.md` (`gemini-1.5-flash` e
 * `text-embedding-004`) foram retirados da API do Google e não respondem mais.
 */

/**
 * Modelo de geração usado no diagnóstico/plano de ação (Tasks 4.1 e 4.3), no
 * formato `fornecedor/modelo[:variante]` da OpenRouter. O sufixo `:free` importa:
 * é o que roteia para o tier gratuito (50 requisições/dia por chave).
 */
export function obterModeloLlm(): string {
  return process.env.OPENROUTER_MODELO_LLM ?? "nvidia/nemotron-3-ultra-550b-a55b:free";
}

/**
 * Modelo do assistente conversacional (chat do painel). Separado do modelo
 * do diagnóstico porque o critério é outro: num chat, latência pesa mais do
 * que profundidade de raciocínio. Medido com tool calling em streaming:
 * super-120b responde em ~6s; o ultra leva ~35s por turno.
 */
export function obterModeloChat(): string {
  return process.env.OPENROUTER_MODELO_CHAT ?? "nvidia/nemotron-3-super-120b-a12b:free";
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
