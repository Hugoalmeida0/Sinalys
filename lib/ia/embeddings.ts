import { embed } from "ai";
import { criarProvedorGoogle } from "./provedor";
import { DIMENSAO_EMBEDDING, TIPO_TAREFA_EMBEDDING, obterModeloEmbedding } from "./constantes";

/**
 * Gera o embedding de um texto na dimensão esperada pela coluna
 * `casos_historicos_embeddings.embedding` (Task 4.2).
 *
 * O vetor é normalizado para norma 1. Para a distância de cosseno usada hoje
 * (`<=>`) isso é indiferente — cosseno já é invariante a escala —, mas o modelo
 * só devolve vetores normalizados na dimensão nativa (3072), e não na truncada.
 * Normalizar aqui mantém a base consistente e deixa aberta a troca futura para
 * produto interno (`<#>`), que é mais barato e exige vetores unitários.
 */
export async function gerarEmbedding(texto: string): Promise<number[]> {
  const conteudo = texto.trim();
  if (!conteudo) {
    throw new Error("Texto vazio: não há o que vetorizar.");
  }

  const google = criarProvedorGoogle();

  const { embedding } = await embed({
    model: google.textEmbeddingModel(obterModeloEmbedding()),
    value: conteudo,
    providerOptions: {
      google: {
        outputDimensionality: DIMENSAO_EMBEDDING,
        taskType: TIPO_TAREFA_EMBEDDING,
      },
    },
  });

  if (embedding.length !== DIMENSAO_EMBEDDING) {
    throw new Error(
      `Embedding retornou ${embedding.length} dimensões, esperado ${DIMENSAO_EMBEDDING}. ` +
        "A coluna casos_historicos_embeddings.embedding é vector(768) e rejeitaria este vetor."
    );
  }

  return normalizar(embedding);
}

function normalizar(vetor: number[]): number[] {
  const norma = Math.sqrt(vetor.reduce((acc, v) => acc + v * v, 0));
  // Vetor nulo não tem direção; devolvê-lo como está evita divisão por zero.
  if (norma === 0) return vetor;
  return vetor.map((v) => v / norma);
}
