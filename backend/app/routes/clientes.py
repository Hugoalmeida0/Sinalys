from fastapi import APIRouter, Depends

from app.controllers import clientes_controller
from app.controllers.sessao import Contexto, contexto_projeto
from app.schemas.painel import DetalheCliente

router = APIRouter(prefix="/clientes", tags=["clientes"])


@router.get("/{cliente_id}", response_model=DetalheCliente)
def detalhe(cliente_id: str, contexto: Contexto = Depends(contexto_projeto)):
    """Detalhe do cliente: score, evidências (motivos do motor), explicação, evolução e base do simulador."""
    return clientes_controller.detalhe(contexto, cliente_id)
