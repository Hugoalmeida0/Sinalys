"""Catálogo de métricas do projeto (``definicoes_metricas``)."""

import uuid

from app.errors import ErroApi, ErroValidacao
from app.models import metricas as metricas_model

TIPOS_VALOR = ("numero", "texto", "booleano")


def listar(projeto_id: str) -> dict:
    return {"definicoes_metricas": metricas_model.listar(projeto_id)}


def criar(projeto_id: str, dados: dict) -> dict:
    if not isinstance(dados.get("codigo"), str) or not isinstance(dados.get("rotulo"), str):
        raise ErroValidacao("Campos 'codigo' e 'rotulo' são obrigatórios.")
    if dados.get("tipo_valor") not in TIPOS_VALOR:
        raise ErroValidacao(f"tipo_valor deve ser um de: {', '.join(TIPOS_VALOR)}.")
    try:
        definicao = metricas_model.upsert(
            {
                "id": str(uuid.uuid4()),
                "projeto_id": projeto_id,
                "codigo": dados["codigo"],
                "rotulo": dados["rotulo"],
                "tipo_valor": dados["tipo_valor"],
                "unidade": dados.get("unidade"),
                "cadencia": dados.get("cadencia"),
                "descricao": dados.get("descricao"),
            }
        )
    except Exception as erro:  # noqa: BLE001
        raise ErroApi(str(erro)) from erro
    metricas_model.id_por_codigo_cache.limpar()
    return {"definicao_metrica": definicao}
