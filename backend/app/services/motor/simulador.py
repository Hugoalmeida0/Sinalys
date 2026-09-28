"""Simulador de cenários: projeta o score se sinais acionados forem reduzidos.

Mesma fórmula do motor (média ponderada), aplicada sobre a última predição. Não
grava nada nem recalcula a carteira — é uma estimativa para planejar. O
frontend executa a mesma conta localmente para a resposta ser instantânea ao
arrastar os controles; esta versão é a referência testada.
"""

from dataclasses import dataclass, field

from app.services.motor.faixa import faixa_risco_do_score
from app.services.motor.urgencia import calcular_score_prioridade
from app.utils.numeros import js_round


@dataclass
class SinalSimulavel:
    codigo: str
    metrica: str
    peso: float
    pontos: float
    descricao: str


@dataclass
class BaseSimulacao:
    score_risco: float
    soma_pesos: float
    mrr: float | None
    impacto_relativo: float
    sinais: list[SinalSimulavel] = field(default_factory=list)


def limitar_reducao(valor: float) -> int:
    try:
        return min(100, max(0, js_round(float(valor))))
    except (TypeError, ValueError, OverflowError):
        return 0


def receita_em_risco(mrr: float | None, score: float) -> int | None:
    """Exposição anual ponderada: MRR × 12 × score/100."""
    return None if mrr is None else js_round(mrr * 12 * (score / 100))


def simular_cenario(base: BaseSimulacao, cenario: dict[str, float]) -> dict:
    ajustes = []
    for sinal in base.sinais:
        reducao = limitar_reducao(cenario.get(sinal.codigo, 0))
        if reducao > 0:
            ajustes.append({"sinal": sinal, "reducaoPct": reducao, "pontosRetirados": sinal.pontos * (reducao / 100)})

    pontos_retirados = sum(a["pontosRetirados"] for a in ajustes)
    delta_score = pontos_retirados / base.soma_pesos if base.soma_pesos > 0 else 0
    score_antes = base.score_risco
    score_depois = max(0, js_round(score_antes - delta_score))

    return {
        "scoreAntes": score_antes,
        "scoreDepois": score_depois,
        "faixaAntes": faixa_risco_do_score(score_antes, 100),
        "faixaDepois": faixa_risco_do_score(score_depois, 100),
        "receitaRiscoAntes": receita_em_risco(base.mrr, score_antes),
        "receitaRiscoDepois": receita_em_risco(base.mrr, score_depois),
        "prioridadeAntes": js_round(calcular_score_prioridade(score_antes, base.impacto_relativo) * 10) / 10,
        "prioridadeDepois": js_round(calcular_score_prioridade(score_depois, base.impacto_relativo) * 10) / 10,
        "reducaoScore": score_antes - score_depois,
        "ajustes": ajustes,
    }
