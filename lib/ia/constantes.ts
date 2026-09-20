export function obterModeloLlm(): string {
  return process.env.OPENROUTER_MODELO_LLM ?? "nvidia/nemotron-3-ultra-550b-a55b:free";
}

export function obterModeloChat(): string {
  return process.env.OPENROUTER_MODELO_CHAT ?? "nvidia/nemotron-3-super-120b-a12b:free";
}

export function obterModeloEmbedding(): string {
  return process.env.GEMINI_MODELO_EMBEDDING ?? "gemini-embedding-001";
}

export const DIMENSAO_EMBEDDING = 768;

export const TIPO_TAREFA_EMBEDDING = "SEMANTIC_SIMILARITY";

export const PADRAO_LIMITE_LOOKALIKE = 3;

export const PADRAO_SIMILARIDADE_MINIMA = 0.5;
