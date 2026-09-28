"""Ponto de entrada da API Sinalys (FastAPI).

    uvicorn main:app --reload --port 8000
"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import obter_settings
from app.errors import ErroApi
from app.routes import api_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("sinalys")

app = FastAPI(
    title="Sinalys API",
    version="1.0.0",
    description=(
        "Motor determinístico de score de risco (0–100) + assistente de IA somente leitura "
        "(OpenRouter + RAG com pgvector), com contingência por regras."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=obter_settings().lista_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ErroApi)
def tratar_erro_api(_: Request, erro: ErroApi) -> JSONResponse:
    return JSONResponse({"erro": erro.mensagem}, status_code=erro.status)


@app.exception_handler(RequestValidationError)
def tratar_corpo_invalido(_: Request, erro: RequestValidationError) -> JSONResponse:
    return JSONResponse({"erro": "Corpo inválido."}, status_code=400)


@app.exception_handler(Exception)
def tratar_erro_inesperado(_: Request, erro: Exception) -> JSONResponse:
    log.exception("Erro não tratado")
    return JSONResponse({"erro": str(erro) or "Erro interno."}, status_code=500)


app.include_router(api_router)


@app.get("/api/status", tags=["status"])
def status() -> dict:
    return {"ok": True}
