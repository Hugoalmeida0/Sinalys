"""Registro das rotas. Cada módulo declara caminho, dependências e view de saída, e delega ao controller."""

from fastapi import APIRouter

from app.routes import (
    alertas,
    auth,
    clientes,
    contatos,
    eventos,
    health,
    ingestao,
    inteligencia,
    metricas,
    modelo,
    motor,
    painel,
)

api_router = APIRouter(prefix="/api")
for modulo in (auth, painel, clientes, motor, modelo, inteligencia, contatos, alertas, eventos, health, metricas, ingestao):
    api_router.include_router(modulo.router)
