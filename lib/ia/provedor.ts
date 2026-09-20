import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export function criarProvedorGoogle() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Variável de ambiente GOOGLE_GENERATIVE_AI_API_KEY ausente — necessária para gerar embeddings (Módulo 4)."
    );
  }

  return createGoogleGenerativeAI({ apiKey });
}

export function criarProvedorOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Variável de ambiente OPENROUTER_API_KEY ausente — necessária para gerar o diagnóstico (Módulo 4)."
    );
  }

  return createOpenRouter({
    apiKey,

    appName: "Sinalys",
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  });
}
