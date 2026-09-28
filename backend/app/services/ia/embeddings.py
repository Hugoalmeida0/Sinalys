"""Embeddings via Gemini (Google AI Studio), truncados em 768 dimensões."""

import math

import httpx

from app.config import obter_settings
from app.errors import ErroConfiguracao

DIMENSAO_EMBEDDING = 768
TIPO_TAREFA_EMBEDDING = "SEMANTIC_SIMILARITY"
URL_GEMINI = "https://generativelanguage.googleapis.com/v1beta/models/{modelo}:embedContent"
TIMEOUT_S = 30


def obter_modelo_embedding() -> str:
    return obter_settings().gemini_modelo_embedding


def gerar_embedding(texto: str) -> list[float]:
    conteudo = texto.strip()
    if not conteudo:
        raise ValueError("Texto vazio: não há o que vetorizar.")

    chave = obter_settings().gemini_api_key
    if not chave:
        raise ErroConfiguracao("Variável de ambiente GEMINI_API_KEY ausente — necessária para gerar embeddings.")

    modelo = obter_modelo_embedding()
    resposta = httpx.post(
        URL_GEMINI.format(modelo=modelo),
        headers={"x-goog-api-key": chave},
        json={
            "model": f"models/{modelo}",
            "content": {"parts": [{"text": conteudo}]},
            "taskType": TIPO_TAREFA_EMBEDDING,
            "outputDimensionality": DIMENSAO_EMBEDDING,
        },
        timeout=TIMEOUT_S,
    )
    if resposta.status_code >= 400:
        raise RuntimeError(f"Gemini respondeu HTTP {resposta.status_code}: {resposta.text[:300]}")

    vetor = resposta.json().get("embedding", {}).get("values") or []
    if len(vetor) != DIMENSAO_EMBEDDING:
        raise RuntimeError(
            f"Embedding retornou {len(vetor)} dimensões, esperado {DIMENSAO_EMBEDDING}. "
            "A coluna casos_historicos_embeddings.embedding é vector(768) e rejeitaria este vetor."
        )
    return normalizar(vetor)


def normalizar(vetor: list[float]) -> list[float]:
    """Norma unitária: abaixo de 3072 dimensões o Gemini não entrega o vetor normalizado."""
    norma = math.sqrt(sum(v * v for v in vetor))
    if norma == 0:
        return vetor
    return [v / norma for v in vetor]
