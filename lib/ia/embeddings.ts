import { embed } from "ai";
import { criarProvedorGoogle } from "./provedor";
import { DIMENSAO_EMBEDDING, TIPO_TAREFA_EMBEDDING, obterModeloEmbedding } from "./constantes";

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

  if (norma === 0) return vetor;
  return vetor.map((v) => v / norma);
}
