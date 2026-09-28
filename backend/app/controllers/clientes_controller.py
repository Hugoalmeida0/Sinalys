from app.controllers.sessao import Contexto
from app.services.painel import consultas


def detalhe(contexto: Contexto, cliente_id: str) -> dict:
    return consultas.detalhe_cliente(contexto.projeto_id, cliente_id)
