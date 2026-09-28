from app.controllers.sessao import Contexto, projeto_do_corpo
from app.schemas.relacionamento import CancelarEntrada
from app.services import relacionamento


def cancelar(contexto: Contexto, corpo: CancelarEntrada | None) -> dict:
    dados = corpo.dados() if corpo else {}
    return relacionamento.registrar_cancelamento(projeto_do_corpo(contexto, dados), dados)
