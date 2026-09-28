"""Tabela ``eventos_desfecho``: cancelamentos e demais desfechos registrados."""

from app.database import buscar_todas_linhas, cliente_admin


def listar_do_projeto(projeto_id: str) -> list[dict]:
    return buscar_todas_linhas(
        lambda: cliente_admin()
        .table("eventos_desfecho")
        .select("id, entidade_id, codigo_evento, ocorrido_em, motivo_categoria, motivo_detalhe")
        .eq("projeto_id", projeto_id)
        .order("entidade_id")
        .order("id")
    )


def listar_da_entidade(entidade_id: str, limite: int, colunas: str = "id, codigo_evento, ocorrido_em") -> list[dict]:
    return (
        cliente_admin()
        .table("eventos_desfecho")
        .select(colunas)
        .eq("entidade_id", entidade_id)
        .order("ocorrido_em", desc=True)
        .limit(limite)
        .execute()
        .data
        or []
    )


def inserir(linha: dict) -> None:
    cliente_admin().table("eventos_desfecho").insert(linha).execute()


def upsert_lote(linhas: list[dict]) -> int:
    resposta = (
        cliente_admin()
        .table("eventos_desfecho")
        .upsert(linhas, on_conflict="entidade_id,codigo_evento,ocorrido_em", count="exact")
        .execute()
    )
    return resposta.count if resposta.count is not None else len(linhas)
