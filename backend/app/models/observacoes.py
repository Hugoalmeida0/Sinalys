from app.database import buscar_todas_linhas, cliente_admin, primeira_linha


def listar_numericas_ate(
    projeto_id: str, metrica_id: str, referencia_iso: str, *, mais_recentes_primeiro: bool
) -> list[dict]:
    """Observações numéricas de uma métrica, conhecidas até ``referencia_iso``.

    Ordena por entidade e, dentro dela, por data — o motor consome a lista já
    agrupada. O filtro em ``disponivel_em`` evita usar dado que ainda não
    existia na data de referência (sem vazamento do futuro).
    """
    return buscar_todas_linhas(
        lambda: cliente_admin()
        .table("observacoes")
        .select("entidade_id, valor_numero, observado_em")
        .eq("projeto_id", projeto_id)
        .eq("metrica_id", metrica_id)
        .not_.is_("valor_numero", "null")
        .lte("observado_em", referencia_iso)
        .lte("disponivel_em", referencia_iso)
        .order("entidade_id")
        .order("observado_em", desc=mais_recentes_primeiro)
    )


def ultima_observacao(projeto_id: str) -> dict | None:
    return primeira_linha(
        cliente_admin()
        .table("observacoes")
        .select("observado_em")
        .eq("projeto_id", projeto_id)
        .order("observado_em", desc=True)
    )


def listar_receita(
    projeto_id: str, metrica_id: str, entidade_ids: list[str], ate_iso: str
) -> list[dict]:
    """Histórico de receita das entidades, da mais recente para a mais antiga."""
    return buscar_todas_linhas(
        lambda: cliente_admin()
        .table("observacoes")
        .select("entidade_id, valor_numero")
        .eq("projeto_id", projeto_id)
        .eq("metrica_id", metrica_id)
        .in_("entidade_id", entidade_ids)
        .not_.is_("valor_numero", "null")
        .lte("observado_em", ate_iso)
        .order("entidade_id")
        .order("observado_em", desc=True)
    )


def upsert_lote(linhas: list[dict]) -> int:
    resposta = (
        cliente_admin()
        .table("observacoes")
        .upsert(linhas, on_conflict="entidade_id,metrica_id,observado_em", count="exact")
        .execute()
    )
    return resposta.count if resposta.count is not None else len(linhas)
