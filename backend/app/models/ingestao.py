"""Tabelas ``execucoes_ingestao`` e ``mapeamentos_importacao`` e o Storage dos arquivos brutos."""

from app.database import cliente_admin, primeira_linha

COLUNAS_MAPEAMENTO = "id, aba_origem, coluna_origem, tipo_destino, campo_destino, metrica_id, config_transformacao"


def enviar_arquivo(bucket: str, caminho: str, conteudo: bytes, content_type: str) -> None:
    cliente_admin().storage.from_(bucket).upload(
        caminho, conteudo, {"content-type": content_type, "upsert": "false"}
    )


def baixar_arquivo(bucket: str, caminho: str) -> bytes:
    return cliente_admin().storage.from_(bucket).download(caminho)


def remover_arquivo(bucket: str, caminho: str) -> None:
    try:
        cliente_admin().storage.from_(bucket).remove([caminho])
    except Exception:  # noqa: BLE001 - limpeza de melhor esforço
        pass


def inserir_execucao(linha: dict) -> None:
    cliente_admin().table("execucoes_ingestao").insert(linha).execute()


def buscar_execucao(execucao_id: str, colunas: str) -> dict | None:
    return primeira_linha(cliente_admin().table("execucoes_ingestao").select(colunas).eq("id", execucao_id))


def atualizar_execucao(execucao_id: str, campos: dict) -> None:
    cliente_admin().table("execucoes_ingestao").update(campos).eq("id", execucao_id).execute()


def listar_mapeamentos(execucao_id: str, com_metrica: bool = False) -> list[dict]:
    colunas = COLUNAS_MAPEAMENTO + (", definicoes_metricas(codigo, rotulo)" if com_metrica else "")
    return (
        cliente_admin()
        .table("mapeamentos_importacao")
        .select(colunas)
        .eq("execucao_ingestao_id", execucao_id)
        .execute()
        .data
        or []
    )


def upsert_mapeamentos(linhas: list[dict]) -> list[dict]:
    gravados = (
        cliente_admin()
        .table("mapeamentos_importacao")
        .upsert(linhas, on_conflict="execucao_ingestao_id,aba_origem,coluna_origem")
        .execute()
        .data
        or []
    )
    campos = ("id", "aba_origem", "coluna_origem", "tipo_destino", "campo_destino", "metrica_id")
    return [{c: g.get(c) for c in campos} for g in gravados]
