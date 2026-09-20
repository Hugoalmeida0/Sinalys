import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

/**
 * Task 4.1 — integração dos provedores de IA via Vercel AI SDK.
 *
 * Os providers são criados sob demanda (e não no topo do módulo) para que a
 * ausência de uma chave só estoure quando a IA for realmente usada: as rotas
 * dos Módulos 2 e 3 importam código que cruza este arquivo e não devem quebrar
 * por causa disso.
 */

/** Gemini — usado apenas para embeddings (Task 4.2). */
export function criarProvedorGoogle() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Variável de ambiente GOOGLE_GENERATIVE_AI_API_KEY ausente — necessária para gerar embeddings (Módulo 4)."
    );
  }

  return createGoogleGenerativeAI({ apiKey });
}

/** OpenRouter — usado para a geração do diagnóstico (Task 4.3). */
export function criarProvedorOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Variável de ambiente OPENROUTER_API_KEY ausente — necessária para gerar o diagnóstico (Módulo 4)."
    );
  }

  return createOpenRouter({
    apiKey,
    // Cabeçalhos opcionais de atribuição no painel da OpenRouter; sem efeito funcional.
    appName: "Sinalys",
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  });
}
