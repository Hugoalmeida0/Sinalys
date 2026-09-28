from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.controllers import inteligencia_controller
from app.controllers.sessao import Contexto, contexto_projeto
from app.schemas.inteligencia import AnaliseSaida, AnalisarEntrada, ChatEntrada, FeedbackEntrada, FeedbackSaida

router = APIRouter(prefix="/inteligencia", tags=["inteligencia"])


@router.post("/analisar", response_model=AnaliseSaida)
def analisar(corpo: AnalisarEntrada | None = None, contexto: Contexto = Depends(contexto_projeto)):
    """Diagnóstico e plano de ação pela LLM (somente leitura), com fallback por regras."""
    return inteligencia_controller.analisar(contexto, corpo)


@router.post("/feedback", response_model=FeedbackSaida, status_code=201)
def feedback(corpo: FeedbackEntrada | None = None, contexto: Contexto = Depends(contexto_projeto)):
    """Registra o desfecho de um caso na memória vetorial (alimenta os próximos diagnósticos)."""
    return inteligencia_controller.feedback(contexto, corpo)


@router.post("/chat")
def chat(corpo: ChatEntrada | None = None, contexto: Contexto = Depends(contexto_projeto)):
    """Assistente com ferramentas somente leitura. Resposta em NDJSON (uma linha JSON por evento)."""
    eventos = inteligencia_controller.conversar(contexto, corpo)
    return StreamingResponse(eventos, media_type="application/x-ndjson", headers={"Cache-Control": "no-cache"})
