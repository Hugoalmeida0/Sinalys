from app.database import cliente_admin, em_lotes

LOTE_FILTRO_IN = 200


def listar_vigentes(projeto_id: str, entidade_ids: list[str], agora_iso: str) -> list[dict]:
    linhas: list[dict] = []
    for lote in em_lotes(entidade_ids, LOTE_FILTRO_IN):
        linhas.extend(
            cliente_admin()
            .table("silenciamentos_alerta")
            .select("entidade_id, silenciado_ate")
            .eq("projeto_id", projeto_id)
            .gt("silenciado_ate", agora_iso)
            .in_("entidade_id", lote)
            .execute()
            .data
            or []
        )
    return linhas


def inserir(linha: dict) -> dict:
    gravado = (cliente_admin().table("silenciamentos_alerta").insert(linha).execute().data or [{}])[0]
    return {chave: gravado.get(chave) for chave in ("id", "silenciado_ate", "motivo", "criado_em")}


def encerrar_vigentes(projeto_id: str, entidade_id: str, agora_iso: str) -> int:
    linhas = (
        cliente_admin()
        .table("silenciamentos_alerta")
        .update({"silenciado_ate": agora_iso})
        .eq("projeto_id", projeto_id)
        .eq("entidade_id", entidade_id)
        .gt("silenciado_ate", agora_iso)
        .execute()
        .data
        or []
    )
    return len(linhas)
