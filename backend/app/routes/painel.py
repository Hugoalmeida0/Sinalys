from fastapi import APIRouter, Depends

from app.controllers import painel_controller
from app.controllers.sessao import Contexto, contexto_projeto
from app.schemas.painel import CarteiraSaida, FilaSaida, InicioSaida, KpisSaida

router = APIRouter(prefix="/painel", tags=["painel"])


@router.get("/clientes", response_model=CarteiraSaida)
def carteira(modelo_id: str | None = None, contexto: Contexto = Depends(contexto_projeto)):
    """Carteira completa com o resumo por faixa de risco."""
    return painel_controller.carteira(contexto, modelo_id)


@router.get("/fila", response_model=FilaSaida)
def fila(
    modelo_id: str | None = None,
    faixas: str | None = None,
    incluir_silenciados: str | None = None,
    segmento: str | None = None,
    contexto: Contexto = Depends(contexto_projeto),
):
    """Fila do dia ordenada por prioridade (risco × impacto financeiro)."""
    return painel_controller.fila(contexto, modelo_id, faixas, incluir_silenciados, segmento)


@router.get("/kpis", response_model=KpisSaida)
def kpis(modelo_id: str | None = None, contexto: Contexto = Depends(contexto_projeto)):
    return painel_controller.kpis(contexto, modelo_id)


@router.get("/inicio", response_model=InicioSaida)
def inicio(contexto: Contexto = Depends(contexto_projeto)):
    """Tela inicial: os 5 clientes de maior prioridade (sem erro quando ainda não há modelo ativo)."""
    return painel_controller.inicio(contexto)


@router.get("/inicio/kpis", response_model=KpisSaida)
def kpis_inicio(contexto: Contexto = Depends(contexto_projeto)):
    return painel_controller.kpis_inicio(contexto)
