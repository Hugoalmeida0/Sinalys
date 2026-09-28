"""Tabela ``motivos_predicao``: a contribuição de cada regra para uma predição (as evidências do score)."""

from app.database import buscar_todas_linhas, cliente_admin, em_lotes

LOTE_FILTRO_IN = 200


def listar_acionados(predicao_ids: list[str]) -> list[dict]:
    """Motivos acionados, com a regra e a métrica — alimentam os "principais sinais" da carteira."""
    linhas: list[dict] = []
    for lote in em_lotes(predicao_ids, LOTE_FILTRO_IN):
        linhas.extend(
            buscar_todas_linhas(
                lambda lote=lote: cliente_admin()
                .table("motivos_predicao")
                .select(
                    "predicao_id, regra_modelo_id, acionado, valor_observado, pontos, "
                    "regras_modelo(codigo_sinal, config_regra, definicoes_metricas(rotulo, unidade, codigo))"
                )
                .in_("predicao_id", lote)
                .eq("acionado", True)
                .order("predicao_id")
                .order("regra_modelo_id")
            )
        )
    return linhas


def listar_da_predicao(predicao_id: str) -> list[dict]:
    return (
        cliente_admin()
        .table("motivos_predicao")
        .select(
            "acionado, valor_observado, pontos, "
            "regras_modelo(codigo_sinal, peso, definicoes_metricas(rotulo, unidade))"
        )
        .eq("predicao_id", predicao_id)
        .execute()
        .data
        or []
    )


def apagar_das_predicoes(predicao_ids: list[str]) -> None:
    cliente_admin().table("motivos_predicao").delete().in_("predicao_id", predicao_ids).execute()


def inserir_lote(linhas: list[dict]) -> None:
    cliente_admin().table("motivos_predicao").insert(linhas).execute()
