from app.database import buscar_todas_linhas, cliente_admin, primeira_linha


def listar_do_modelo(projeto_id: str, modelo_id: str) -> list[dict]:
    """Todas as predições do modelo, agrupadas por entidade e da mais recente para a mais antiga."""
    return buscar_todas_linhas(
        lambda: cliente_admin()
        .table("predicoes")
        .select("id, entidade_id, referencia_em, pontuacao, faixa_risco, cobertura, valor_impacto")
        .eq("projeto_id", projeto_id)
        .eq("modelo_id", modelo_id)
        .order("entidade_id")
        .order("referencia_em", desc=True)
    )


def listar_series(projeto_id: str, modelo_id: str, entidade_ids: list[str] | None = None) -> list[dict]:
    """Série temporal (mais antiga primeiro) usada pelos KPIs de antecedência e receita salva."""

    def montar():
        consulta = (
            cliente_admin()
            .table("predicoes")
            .select("entidade_id, referencia_em, faixa_risco, valor_impacto")
            .eq("projeto_id", projeto_id)
            .eq("modelo_id", modelo_id)
        )
        if entidade_ids is not None:
            consulta = consulta.in_("entidade_id", entidade_ids)
        return consulta.order("entidade_id").order("referencia_em")

    return buscar_todas_linhas(montar)


def listar_existentes(modelo_id: str, referencia_iso: str, entidade_ids: list[str]) -> list[dict]:
    return buscar_todas_linhas(
        lambda: cliente_admin()
        .table("predicoes")
        .select("id, entidade_id")
        .eq("modelo_id", modelo_id)
        .eq("referencia_em", referencia_iso)
        .in_("entidade_id", entidade_ids)
        .order("id")
    )


def upsert_lote(linhas: list[dict]) -> None:
    cliente_admin().table("predicoes").upsert(linhas).execute()


def ultima_da_entidade(projeto_id: str, entidade_id: str, modelo_id: str | None) -> dict | None:
    consulta = (
        cliente_admin()
        .table("predicoes")
        .select("id, modelo_id, referencia_em, pontuacao, faixa_risco, cobertura, valor_impacto")
        .eq("projeto_id", projeto_id)
        .eq("entidade_id", entidade_id)
    )
    if modelo_id:
        consulta = consulta.eq("modelo_id", modelo_id)
    return primeira_linha(consulta.order("referencia_em", desc=True))


def evolucao_da_entidade(entidade_id: str, modelo_id: str, desde_iso: str) -> list[dict]:
    return (
        cliente_admin()
        .table("predicoes")
        .select("referencia_em, pontuacao")
        .eq("entidade_id", entidade_id)
        .eq("modelo_id", modelo_id)
        .gte("referencia_em", desde_iso)
        .order("referencia_em")
        .execute()
        .data
        or []
    )
