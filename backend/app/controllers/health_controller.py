from app.controllers.sessao import Contexto, projeto_do_corpo
from app.schemas.health import AgendamentoEntrada, ConfiguracaoEntrada
from app.services import health


def pagina_publica(token: str) -> dict:
    return health.buscar_health_publico(token)


def pedir_call(corpo: AgendamentoEntrada | None) -> dict:
    return health.registrar_pedido_de_call(corpo.dados() if corpo else {})


def configurar(contexto: Contexto, corpo: ConfiguracaoEntrada | None) -> dict:
    dados = corpo.dados() if corpo else {}
    return health.salvar_configuracao(projeto_do_corpo(contexto, dados), dados)
