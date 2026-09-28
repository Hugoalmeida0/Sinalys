from fastapi import APIRouter, Depends

from app.controllers import motor_controller
from app.controllers.sessao import Contexto, contexto_projeto
from app.schemas.motor import AtualizarPesosEntrada, ModeloSaida, NovaRegraEntrada

router = APIRouter(prefix="/modelo", tags=["modelo"])


@router.get("", response_model=ModeloSaida)
def obter(contexto: Contexto = Depends(contexto_projeto)):
    return motor_controller.obter_modelo(contexto)


@router.patch("/regras", response_model=ModeloSaida)
def atualizar_pesos(corpo: AtualizarPesosEntrada | None = None, contexto: Contexto = Depends(contexto_projeto)):
    """Altera pesos e recalcula a carteira."""
    return motor_controller.atualizar_pesos(contexto, corpo)


@router.post("/regras", response_model=ModeloSaida, status_code=201)
def criar_regra(corpo: NovaRegraEntrada | None = None, contexto: Contexto = Depends(contexto_projeto)):
    """Adiciona um sinal ao modelo e recalcula a carteira."""
    return motor_controller.criar_regra(contexto, corpo)
