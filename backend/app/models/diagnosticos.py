"""Tabela ``diagnosticos_ia``: cache/auditoria das análises.

Quem grava aqui é o backend, com a saída já validada da LLM. A LLM não tem
acesso ao banco e não toca em ``predicoes`` nem em ``motivos_predicao``.
"""

from app.database import cliente_admin, primeira_linha


def buscar_da_predicao(projeto_id: str, predicao_id: str) -> dict | None:
    return primeira_linha(
        cliente_admin()
        .table("diagnosticos_ia")
        .select(
            "id, diagnostico_principal, analise_lookalike, plano_acao_imediato, casos_similares, "
            "modelo_ia, modelo_embedding, entidade_id"
        )
        .eq("projeto_id", projeto_id)
        .eq("predicao_id", predicao_id)
        .order("criado_em", desc=True)
    )


def buscar_ultimo_da_entidade(entidade_id: str, colunas: str, projeto_id: str | None = None) -> dict | None:
    consulta = cliente_admin().table("diagnosticos_ia").select(colunas)
    if projeto_id:
        consulta = consulta.eq("projeto_id", projeto_id)
    return primeira_linha(consulta.eq("entidade_id", entidade_id).order("criado_em", desc=True))


def inserir(linha: dict) -> None:
    cliente_admin().table("diagnosticos_ia").insert(linha).execute()
