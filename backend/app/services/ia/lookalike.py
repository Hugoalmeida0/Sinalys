"""Busca de casos históricos semelhantes (RAG sobre pgvector)."""

from dataclasses import asdict, dataclass

from app.models import casos_historicos as casos_model
from app.services.ia.embeddings import gerar_embedding

PADRAO_LIMITE_LOOKALIKE = 3
PADRAO_SIMILARIDADE_MINIMA = 0.5


@dataclass
class CasoSimilar:
    id: str
    entidade_id: str
    nome_exibicao: str | None
    contexto_texto: str
    acao_realizada: str
    desfecho: str  # "recuperado" | "cancelado"
    similaridade: float
    criado_em: str

    def para_dict(self) -> dict:
        return asdict(self)


def buscar_casos_similares(
    projeto_id: str,
    perfil_risco: str,
    entidade_excluida: str | None = None,
    limite: int = PADRAO_LIMITE_LOOKALIKE,
    similaridade_minima: float = PADRAO_SIMILARIDADE_MINIMA,
) -> list[CasoSimilar]:
    embedding = gerar_embedding(perfil_risco)
    try:
        linhas = casos_model.buscar_similares(projeto_id, embedding, limite, entidade_excluida, similaridade_minima)
    except Exception as erro:  # noqa: BLE001
        raise RuntimeError(f"Falha na busca lookalike (pgvector): {erro}") from erro

    return [
        CasoSimilar(
            id=linha["id"],
            entidade_id=linha["entidade_id"],
            nome_exibicao=linha.get("nome_exibicao"),
            contexto_texto=linha["contexto_texto"],
            acao_realizada=linha["acao_realizada"],
            desfecho=linha["desfecho"],
            similaridade=float(linha["similaridade"]),
            criado_em=linha["criado_em"],
        )
        for linha in linhas
    ]
