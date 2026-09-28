"""Prioridade da fila: risco modulado pelo impacto financeiro relativo.

O score de risco e a faixa continuam puros (dinheiro é impacto, nunca risco);
a prioridade é derivada na hora de montar a fila e não é persistida.
"""

import math
import unicodedata
from dataclasses import dataclass

FATOR_IMPACTO_MIN = 0.5
FATOR_IMPACTO_MAX = 1.5

IMPACTO_REL_POR_PORTE = {"pequeno": 0.25, "medio": 0.5, "grande": 0.75}
IMPACTO_REL_DESCONHECIDO = 0.5


def normalizar_porte(porte: str | None) -> str:
    sem_acento = unicodedata.normalize("NFD", porte or "")
    sem_acento = "".join(c for c in sem_acento if not unicodedata.combining(c))
    return sem_acento.strip().lower()


@dataclass
class FaixaReceita:
    minimo: float
    maximo: float


def calcular_faixa_receita(receitas: list[float | None]) -> FaixaReceita | None:
    validas = [r for r in receitas if r is not None and math.isfinite(r) and r > 0]
    if len(validas) < 2:
        return None
    minimo, maximo = min(validas), max(validas)
    return FaixaReceita(minimo, maximo) if maximo > minimo else None


def calcular_impacto_relativo(receita: float | None, faixa: FaixaReceita | None, porte: str | None = None) -> float:
    """Posição da receita na carteira ativa, em escala log, de 0 (menor conta) a 1 (maior).

    Sem receita mapeada usa o porte cadastral; nunca zero.
    """
    if receita is None or not math.isfinite(receita) or receita <= 0:
        return IMPACTO_REL_POR_PORTE.get(normalizar_porte(porte), IMPACTO_REL_DESCONHECIDO)
    if faixa is None:
        return IMPACTO_REL_DESCONHECIDO
    rel = math.log(receita / faixa.minimo) / math.log(faixa.maximo / faixa.minimo)
    return min(1.0, max(0.0, rel))


def calcular_score_prioridade(pontuacao_risco: float, impacto_relativo: float) -> float:
    """Prioridade = risco × (0,5 + impacto relativo): o impacto modula o risco entre 0,5× e 1,5×."""
    fator = FATOR_IMPACTO_MIN + (FATOR_IMPACTO_MAX - FATOR_IMPACTO_MIN) * impacto_relativo
    return min(100.0, max(0.0, pontuacao_risco * fator))


def calcular_score_urgencia(pontuacao_risco: float, valor_impacto: float | None) -> float | None:
    """Ordenação legada (risco × receita), mantida para ``GET /api/motor/fila``."""
    if valor_impacto is None:
        return None
    return pontuacao_risco * valor_impacto


def ordenar_fila_urgencia(predicoes: list[dict]) -> list[dict]:
    com_urgencia = [
        {**p, "score_urgencia": calcular_score_urgencia(p["pontuacao"], p["valor_impacto"])} for p in predicoes
    ]

    def chave(p: dict) -> tuple:
        # Com urgência primeiro (maior para menor); sem urgência depois, por pontuação.
        if p["score_urgencia"] is None:
            return (1, -p["pontuacao"])
        return (0, -p["score_urgencia"])

    return sorted(com_urgencia, key=chave)
