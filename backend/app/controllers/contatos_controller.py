from app.controllers.sessao import Contexto, projeto_do_corpo
from app.schemas.relacionamento import ContatoEntrada
from app.services import relacionamento


def registrar(contexto: Contexto, corpo: ContatoEntrada | None) -> dict:
    dados = corpo.dados() if corpo else {}
    return relacionamento.registrar_contato(projeto_do_corpo(contexto, dados), contexto.usuario, dados)


def listar(contexto: Contexto, cliente_id: str | None, limite: str | None) -> dict:
    return relacionamento.listar_contatos(contexto.projeto_id, cliente_id, limite)
