from app.database import cliente_admin, primeira_linha
from app.utils.cache import cache_ttl

DOZE_HORAS = 60 * 60 * 12


@cache_ttl(DOZE_HORAS)
def buscar_info(projeto_id: str) -> dict | None:
    """``codigo_evento_alvo`` e ``rotulo_entidade`` do projeto (mudam raramente: cache de 12h)."""
    return primeira_linha(
        cliente_admin()
        .table("projetos")
        .select("codigo_evento_alvo, rotulo_entidade")
        .eq("id", projeto_id)
    )


def buscar_codigo_evento_alvo(projeto_id: str) -> dict | None:
    """Leitura sem cache, usada ao gravar um cancelamento."""
    return primeira_linha(
        cliente_admin().table("projetos").select("codigo_evento_alvo").eq("id", projeto_id)
    )
