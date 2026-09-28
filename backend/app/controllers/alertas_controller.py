from app.controllers.sessao import Contexto, projeto_do_corpo
from app.schemas.relacionamento import SilenciarEntrada
from app.services import relacionamento


def silenciar(contexto: Contexto, corpo: SilenciarEntrada | None) -> dict:
    dados = corpo.dados() if corpo else {}
    return relacionamento.silenciar_alertas(projeto_do_corpo(contexto, dados), contexto.usuario, dados)


def reativar(contexto: Contexto, corpo: SilenciarEntrada | None) -> dict:
    dados = corpo.dados() if corpo else {}
    return relacionamento.reativar_alertas(projeto_do_corpo(contexto, dados), dados)
