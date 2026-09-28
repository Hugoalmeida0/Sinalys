from app.controllers.sessao import Contexto, projeto_do_corpo
from app.schemas.ingestao import DefinicaoEntrada
from app.services import metricas


def listar(contexto: Contexto) -> dict:
    return metricas.listar(contexto.projeto_id)


def criar(contexto: Contexto, corpo: DefinicaoEntrada | None) -> dict:
    dados = corpo.dados() if corpo else {}
    return metricas.criar(projeto_do_corpo(contexto, dados), dados)
