from fastapi import APIRouter, Depends

from app.controllers import contatos_controller
from app.controllers.sessao import Contexto, contexto_projeto
from app.schemas.relacionamento import ContatoEntrada, ContatoSaida, ContatosSaida

router = APIRouter(prefix="/contatos", tags=["contatos"])


@router.post("", response_model=ContatoSaida, status_code=201)
def registrar(corpo: ContatoEntrada | None = None, contexto: Contexto = Depends(contexto_projeto)):
    return contatos_controller.registrar(contexto, corpo)


@router.get("", response_model=ContatosSaida)
def listar(cliente_id: str | None = None, limite: str | None = None, contexto: Contexto = Depends(contexto_projeto)):
    return contatos_controller.listar(contexto, cliente_id, limite)
