from fastapi import APIRouter, Depends

from app.controllers import health_controller
from app.controllers.sessao import Contexto, contexto_projeto
from app.schemas.auth import Ok
from app.schemas.health import AgendamentoEntrada, ConfiguracaoEntrada, ConfiguracaoSaida, HealthPublicoSaida

router = APIRouter(prefix="/health", tags=["health score"])


@router.get("/publico/{token}", response_model=HealthPublicoSaida)
def pagina_publica(token: str):
    """Página pública do cliente (sem sessão). Não expõe score, faixa, MRR nem sinais em alerta."""
    return health_controller.pagina_publica(token)


@router.post("/agendamento", response_model=Ok, status_code=201)
def pedir_call(corpo: AgendamentoEntrada | None = None):
    """Pedido de call feito pelo cliente na página pública (sem sessão)."""
    return health_controller.pedir_call(corpo)


@router.put("/configuracao", response_model=ConfiguracaoSaida)
def configurar(corpo: ConfiguracaoEntrada | None = None, contexto: Contexto = Depends(contexto_projeto)):
    return health_controller.configurar(contexto, corpo)
