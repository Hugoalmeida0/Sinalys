from fastapi import UploadFile

from app.controllers.sessao import Contexto
from app.errors import ErroValidacao
from app.schemas.ingestao import MapeamentosEntrada, ProcessarEntrada
from app.services import ingestao


async def enviar(contexto: Contexto, arquivo: UploadFile | None, projeto_id: str | None) -> dict:
    if arquivo is None or not arquivo.filename:
        raise ErroValidacao("Campo 'arquivo' é obrigatório.")
    conteudo = await arquivo.read()
    return ingestao.enviar_arquivo(projeto_id or contexto.projeto_id, arquivo.filename, arquivo.content_type, conteudo)


def listar_mapeamentos(execucao_ingestao_id: str | None) -> dict:
    return ingestao.listar_mapeamentos(execucao_ingestao_id)


def salvar_mapeamentos(contexto: Contexto, corpo: MapeamentosEntrada | None) -> dict:
    return ingestao.salvar_mapeamentos(contexto.projeto_id, corpo.dados() if corpo else {})


def processar(corpo: ProcessarEntrada | None) -> dict:
    return ingestao.processar(corpo.dados() if corpo else {})
