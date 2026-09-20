import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Task 4.1 — integração com a API do Gemini via Vercel AI SDK.
 *
 * O provider é criado sob demanda (e não no topo do módulo) para que a ausência
 * da chave só estoure quando a IA for realmente usada: as rotas do Módulo 2 e 3
 * importam código que cruza este arquivo e não devem quebrar por causa disso.
 */
export function criarProvedorGoogle() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Variável de ambiente GOOGLE_GENERATIVE_AI_API_KEY ausente — necessária para o Módulo 4 (IA/RAG)."
    );
  }

  return createGoogleGenerativeAI({ apiKey });
}
