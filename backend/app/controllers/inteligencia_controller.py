from collections.abc import Iterator

from app.controllers.sessao import Contexto, projeto_do_corpo
from app.errors import ErroValidacao
from app.models import modelos as modelos_model
from app.models import projetos as projetos_model
from app.schemas.inteligencia import AnalisarEntrada, ChatEntrada, FeedbackEntrada
from app.services import relacionamento
from app.services.ia import chat
from app.services.ia.analise import executar_analise
from app.services.ia.chat_ferramentas import EscopoFerramentas


def analisar(contexto: Contexto, corpo: AnalisarEntrada | None) -> dict:
    dados = corpo.dados() if corpo else {}
    return executar_analise(projeto_do_corpo(contexto, dados), dados)


def feedback(contexto: Contexto, corpo: FeedbackEntrada | None) -> dict:
    dados = corpo.dados() if corpo else {}
    return relacionamento.registrar_feedback(projeto_do_corpo(contexto, dados), dados)


def conversar(contexto: Contexto, corpo: ChatEntrada | None) -> Iterator[str]:
    if not corpo or not corpo.messages:
        raise ErroValidacao("Campo 'messages' é obrigatório.")
    projeto = projetos_model.buscar_info(contexto.projeto_id) or {}
    return chat.conversar(
        [m.model_dump() for m in corpo.messages],
        EscopoFerramentas(contexto.projeto_id, modelos_model.id_modelo_ativo(contexto.projeto_id)),
        contexto.usuario.nome,
        projeto.get("rotulo_entidade") or "Cliente",
        corpo.tela.model_dump() if corpo.tela else None,
    )
