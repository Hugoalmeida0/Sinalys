from app.controllers.sessao import Contexto
from app.services.painel import consultas


def carteira(contexto: Contexto, modelo_id: str | None) -> dict:
    return consultas.listar_carteira(contexto.projeto_id, consultas.resolver_modelo(contexto.projeto_id, modelo_id))


def fila(
    contexto: Contexto, modelo_id: str | None, faixas: str | None, incluir_silenciados: str | None, segmento: str | None
) -> dict:
    return consultas.listar_fila(
        contexto.projeto_id,
        consultas.resolver_modelo(contexto.projeto_id, modelo_id),
        faixas,
        incluir_silenciados == "1",
        segmento,
    )


def kpis(contexto: Contexto, modelo_id: str | None) -> dict:
    return consultas.kpis(contexto.projeto_id, consultas.resolver_modelo(contexto.projeto_id, modelo_id))


def inicio(contexto: Contexto) -> dict:
    return consultas.inicio(contexto.projeto_id)


def kpis_inicio(contexto: Contexto) -> dict:
    return consultas.kpis_inicio(contexto.projeto_id)
