"""Tabela ``definicoes_metricas``."""

from app.database import cliente_admin, primeira_linha
from app.utils.cache import cache_ttl

DOZE_HORAS = 60 * 60 * 12
COLUNAS = "id, codigo, rotulo, tipo_valor, unidade, cadencia, descricao"


def buscar_por_codigo(projeto_id: str, codigo: str) -> dict | None:
    return primeira_linha(
        cliente_admin()
        .table("definicoes_metricas")
        .select("id")
        .eq("projeto_id", projeto_id)
        .eq("codigo", codigo)
    )


@cache_ttl(DOZE_HORAS)
def id_por_codigo_cache(projeto_id: str, codigo: str) -> str | None:
    linha = buscar_por_codigo(projeto_id, codigo)
    return linha["id"] if linha else None


def buscar(projeto_id: str, metrica_id: str) -> dict | None:
    return primeira_linha(
        cliente_admin()
        .table("definicoes_metricas")
        .select("id, codigo, tipo_valor")
        .eq("id", metrica_id)
        .eq("projeto_id", projeto_id)
    )


def listar_numericas_exceto(projeto_id: str, codigo_excluido: str) -> list[dict]:
    return (
        cliente_admin()
        .table("definicoes_metricas")
        .select("id, codigo, rotulo, unidade")
        .eq("projeto_id", projeto_id)
        .eq("tipo_valor", "numero")
        .neq("codigo", codigo_excluido)
        .execute()
        .data
        or []
    )


def listar(projeto_id: str) -> list[dict]:
    return (
        cliente_admin()
        .table("definicoes_metricas")
        .select(COLUNAS)
        .eq("projeto_id", projeto_id)
        .order("rotulo")
        .execute()
        .data
        or []
    )


def listar_por_ids(ids: list[str]) -> list[dict]:
    if not ids:
        return []
    return (
        cliente_admin()
        .table("definicoes_metricas")
        .select("id, codigo, tipo_valor")
        .in_("id", ids)
        .execute()
        .data
        or []
    )


def upsert(linha: dict) -> dict:
    resposta = (
        cliente_admin()
        .table("definicoes_metricas")
        .upsert(linha, on_conflict="projeto_id,codigo", ignore_duplicates=False)
        .execute()
    )
    gravada = (resposta.data or [{}])[0]
    return {chave: gravada.get(chave) for chave in COLUNAS.split(", ")}
