from postgrest.exceptions import APIError

from app.database import cliente_admin

VIOLACAO_UNICIDADE = "23505"


class RegraDuplicada(Exception):
    pass


def listar(projeto_id: str, modelo_id: str) -> list[dict]:
    return (
        cliente_admin()
        .table("regras_modelo")
        .select("id, metrica_id, codigo_sinal, config_regra, peso")
        .eq("projeto_id", projeto_id)
        .eq("modelo_id", modelo_id)
        .execute()
        .data
        or []
    )


def listar_com_metrica(modelo_id: str) -> list[dict]:
    return (
        cliente_admin()
        .table("regras_modelo")
        .select("id, codigo_sinal, metrica_id, config_regra, peso, definicoes_metricas(codigo, rotulo, unidade)")
        .eq("modelo_id", modelo_id)
        .execute()
        .data
        or []
    )


def atualizar_peso(regra_id: str, projeto_id: str, modelo_id: str, peso: float) -> list[dict]:
    return (
        cliente_admin()
        .table("regras_modelo")
        .update({"peso": peso})
        .eq("id", regra_id)
        .eq("projeto_id", projeto_id)
        .eq("modelo_id", modelo_id)
        .execute()
        .data
        or []
    )


def inserir(linha: dict) -> None:
    try:
        cliente_admin().table("regras_modelo").insert(linha).execute()
    except APIError as erro:
        if erro.code == VIOLACAO_UNICIDADE:
            raise RegraDuplicada() from erro
        raise
