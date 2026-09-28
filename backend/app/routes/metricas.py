from fastapi import APIRouter, Depends

from app.controllers import metricas_controller
from app.controllers.sessao import Contexto, contexto_projeto
from app.schemas.ingestao import DefinicaoEntrada, DefinicaoSaida, DefinicoesSaida

router = APIRouter(prefix="/definicoes-metricas", tags=["métricas"])


@router.get("", response_model=DefinicoesSaida)
def listar(contexto: Contexto = Depends(contexto_projeto)):
    return metricas_controller.listar(contexto)


@router.post("", response_model=DefinicaoSaida, status_code=201)
def criar(corpo: DefinicaoEntrada | None = None, contexto: Contexto = Depends(contexto_projeto)):
    return metricas_controller.criar(contexto, corpo)
