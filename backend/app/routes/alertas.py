from fastapi import APIRouter, Depends

from app.controllers import alertas_controller
from app.controllers.sessao import Contexto, contexto_projeto
from app.schemas.relacionamento import ReativarSaida, SilenciarEntrada, SilenciarSaida

router = APIRouter(prefix="/alertas", tags=["alertas"])


@router.post("/silenciar", response_model=SilenciarSaida, status_code=201)
def silenciar(corpo: SilenciarEntrada | None = None, contexto: Contexto = Depends(contexto_projeto)):
    """Tira o cliente da fila padrão por N dias, sem apagar o risco."""
    return alertas_controller.silenciar(contexto, corpo)


@router.delete("/silenciar", response_model=ReativarSaida)
def reativar(corpo: SilenciarEntrada | None = None, contexto: Contexto = Depends(contexto_projeto)):
    return alertas_controller.reativar(contexto, corpo)
