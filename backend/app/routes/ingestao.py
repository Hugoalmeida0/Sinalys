from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.controllers import ingestao_controller
from app.controllers.sessao import Contexto, contexto_projeto
from app.schemas.ingestao import MapeamentosEntrada, MapeamentosSaida, ProcessarEntrada, ProcessarSaida, UploadSaida

router = APIRouter(prefix="/ingestao", tags=["ingestão"])


@router.post("/upload", response_model=UploadSaida, status_code=201)
async def upload(
    arquivo: UploadFile | None = File(default=None),
    projeto_id: str | None = Form(default=None),
    contexto: Contexto = Depends(contexto_projeto),
):
    return await ingestao_controller.enviar(contexto, arquivo, projeto_id)


@router.get("/mapeamento", response_model=MapeamentosSaida, dependencies=[Depends(contexto_projeto)])
def listar_mapeamentos(execucao_ingestao_id: str | None = None):
    return ingestao_controller.listar_mapeamentos(execucao_ingestao_id)


@router.post("/mapeamento", response_model=MapeamentosSaida, status_code=201)
def salvar_mapeamentos(corpo: MapeamentosEntrada | None = None, contexto: Contexto = Depends(contexto_projeto)):
    return ingestao_controller.salvar_mapeamentos(contexto, corpo)


@router.post("/processar", response_model=ProcessarSaida, dependencies=[Depends(contexto_projeto)])
def processar(corpo: ProcessarEntrada | None = None):
    return ingestao_controller.processar(corpo)
