from fastapi import APIRouter, Depends

from app.controllers import motor_controller
from app.controllers.sessao import Contexto, contexto_projeto
from app.schemas.motor import CalcularEntrada, CalculoSaida
from app.schemas.painel import FilaUrgenciaSaida

router = APIRouter(prefix="/motor", tags=["motor"])


@router.post("/calcular", response_model=CalculoSaida)
def calcular(corpo: CalcularEntrada | None = None, contexto: Contexto = Depends(contexto_projeto)):
    """Recalcula e grava o score 0–100 de toda a carteira (motor determinístico)."""
    return motor_controller.calcular(contexto, corpo)


@router.get("/fila", response_model=FilaUrgenciaSaida)
def fila(modelo_id: str | None = None, contexto: Contexto = Depends(contexto_projeto)):
    return motor_controller.fila_urgencia(contexto, modelo_id)
