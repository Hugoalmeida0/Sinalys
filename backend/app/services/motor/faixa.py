"""Faixas de risco do score 0–100."""

from typing import Literal

FaixaRisco = Literal["critico", "alerta", "atencao", "saudavel"]
TendenciaScore = Literal["subindo", "descendo", "estavel"]
Severidade = Literal["critica", "alta", "media"]

TODAS_FAIXAS: list[str] = ["critico", "alerta", "atencao", "saudavel"]

# Faixas que entram na fila do dia e nos KPIs de alerta.
FAIXAS_FILA_PADRAO: list[str] = ["critico", "alerta"]


def faixa_risco_do_score(score: float, maximo: float = 100) -> str:
    pct = score / maximo
    if pct > 0.5:
        return "critico"
    if pct >= 0.35:
        return "alerta"
    if pct >= 0.25:
        return "atencao"
    return "saudavel"
