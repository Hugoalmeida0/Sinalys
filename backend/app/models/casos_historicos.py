"""Tabela ``casos_historicos_embeddings`` (pgvector): a memória de casos passados."""

import json

from app.database import cliente_admin


def buscar_similares(
    projeto_id: str,
    embedding: list[float],
    limite: int,
    entidade_excluida: str | None,
    similaridade_minima: float,
) -> list[dict]:
    """Busca por similaridade de cosseno via a função SQL ``buscar_casos_similares``."""
    return (
        cliente_admin()
        .rpc(
            "buscar_casos_similares",
            {
                "p_projeto_id": projeto_id,
                "p_embedding": json.dumps(embedding),
                "p_limite": limite,
                "p_entidade_excluida": entidade_excluida,
                "p_similaridade_minima": similaridade_minima,
            },
        )
        .execute()
        .data
        or []
    )


def inserir(linha: dict) -> None:
    registro = {**linha, "embedding": json.dumps(linha["embedding"])}
    cliente_admin().table("casos_historicos_embeddings").insert(registro).execute()
