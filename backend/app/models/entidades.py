import re

from app.database import buscar_todas_linhas, cliente_admin, primeira_linha

REGEX_UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)


def eh_uuid(valor: str) -> bool:
    return bool(REGEX_UUID.match(valor))


def listar_ids(projeto_id: str) -> list[str]:
    linhas = buscar_todas_linhas(
        lambda: cliente_admin().table("entidades").select("id").eq("projeto_id", projeto_id).order("id")
    )
    return [linha["id"] for linha in linhas]


def listar_para_painel(projeto_id: str) -> list[dict]:
    return buscar_todas_linhas(
        lambda: cliente_admin()
        .table("entidades")
        .select("id, id_externo, nome_exibicao, iniciado_em, atributos, token_compartilhamento")
        .eq("projeto_id", projeto_id)
        # Ordem estável pelo código: é o desempate da fila quando prioridade e risco empatam.
        .order("id_externo")
    )


def resolver(projeto_id: str, identificador: str) -> dict | None:
    """Aceita o UUID da entidade ou o código externo (``C004``)."""
    consulta = (
        cliente_admin()
        .table("entidades")
        .select("id, id_externo, nome_exibicao")
        .eq("projeto_id", projeto_id)
    )
    coluna = "id" if eh_uuid(identificador) else "id_externo"
    return primeira_linha(consulta.eq(coluna, identificador))


def buscar_por_token(token: str) -> dict | None:
    if not eh_uuid(token):
        return None
    return primeira_linha(
        cliente_admin()
        .table("entidades")
        .select("id, projeto_id, id_externo, nome_exibicao, iniciado_em, atributos")
        .eq("token_compartilhamento", token)
    )


def buscar_atributos(entidade_id: str) -> dict:
    linha = primeira_linha(cliente_admin().table("entidades").select("atributos").eq("id", entidade_id))
    return (linha or {}).get("atributos") or {}


def atualizar_atributos(entidade_id: str, atributos: dict) -> None:
    cliente_admin().table("entidades").update({"atributos": atributos}).eq("id", entidade_id).execute()


def listar_por_id_externo(projeto_id: str, ids_externos: list[str]) -> list[dict]:
    return (
        cliente_admin()
        .table("entidades")
        .select("id, id_externo, atributos, iniciado_em")
        .eq("projeto_id", projeto_id)
        .in_("id_externo", ids_externos)
        .execute()
        .data
        or []
    )


def upsert_lote(linhas: list[dict]) -> None:
    cliente_admin().table("entidades").upsert(linhas, on_conflict="id").execute()
