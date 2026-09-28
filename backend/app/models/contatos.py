from app.database import cliente_admin

COLUNAS_RETORNO = ("id", "tipo", "realizado_em", "resumo", "proximo_passo", "proximo_passo_em", "autor_nome", "criado_em")


def inserir(linha: dict) -> dict:
    gravado = (cliente_admin().table("contatos").insert(linha).execute().data or [{}])[0]
    return {chave: gravado.get(chave) for chave in COLUNAS_RETORNO}


def listar(projeto_id: str, limite: int, entidade_id: str | None = None) -> list[dict]:
    consulta = (
        cliente_admin()
        .table("contatos")
        .select(
            "id, entidade_id, tipo, realizado_em, resumo, proximo_passo, proximo_passo_em, "
            "autor_nome, criado_em, entidades(id_externo, nome_exibicao)"
        )
        .eq("projeto_id", projeto_id)
        .order("realizado_em", desc=True)
        .limit(limite)
    )
    if entidade_id:
        consulta = consulta.eq("entidade_id", entidade_id)
    return consulta.execute().data or []


def listar_da_entidade(entidade_id: str, limite: int, colunas: str) -> list[dict]:
    return (
        cliente_admin()
        .table("contatos")
        .select(colunas)
        .eq("entidade_id", entidade_id)
        .order("realizado_em", desc=True)
        .limit(limite)
        .execute()
        .data
        or []
    )


def entidades_contatadas_entre(projeto_id: str, desde_iso: str, ate_iso: str) -> list[str]:
    linhas = (
        cliente_admin()
        .table("contatos")
        .select("entidade_id")
        .eq("projeto_id", projeto_id)
        .gte("realizado_em", desde_iso)
        .lte("realizado_em", ate_iso)
        .execute()
        .data
        or []
    )
    return [linha["entidade_id"] for linha in linhas]
