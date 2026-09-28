from fastapi import APIRouter, Depends

from app.controllers import eventos_controller
from app.controllers.sessao import Contexto, contexto_projeto
from app.schemas.relacionamento import CancelarEntrada, CancelarSaida

router = APIRouter(prefix="/eventos", tags=["eventos"])


@router.post("/cancelar", response_model=CancelarSaida, status_code=201)
def cancelar(corpo: CancelarEntrada | None = None, contexto: Contexto = Depends(contexto_projeto)):
    return eventos_controller.cancelar(contexto, corpo)
