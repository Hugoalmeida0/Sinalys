from app.database import cliente_admin, primeira_linha
from app.utils.cache import cache_ttl

DOZE_HORAS = 60 * 60 * 12


def buscar_modelo_ativo(projeto_id: str) -> dict | None:
    return primeira_linha(
        cliente_admin()
        .table("modelos")
        .select("id, versao")
        .eq("projeto_id", projeto_id)
        .eq("status", "ativo")
    )


@cache_ttl(DOZE_HORAS)
def id_modelo_ativo(projeto_id: str) -> str | None:
    modelo = buscar_modelo_ativo(projeto_id)
    return modelo["id"] if modelo else None
