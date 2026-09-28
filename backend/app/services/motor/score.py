"""Consolidação dos sinais no score 0–100 de uma entidade."""

from app.services.motor.faixa import faixa_risco_do_score
from app.services.motor.tipos import ResultadoPredicao, ResultadoRegra
from app.utils.numeros import arredondar


def calcular_predicao_entidade(
    entidade_id: str, motivos: list[ResultadoRegra], valor_impacto: float | None
) -> ResultadoPredicao:
    """Score = média dos sinais avaliáveis ponderada pelos pesos: Σ(pontos) / Σ(pesos).

    Regras sem dado (valor normalizado nulo) ficam fora da média e reduzem a
    cobertura, que é a fração de regras que puderam ser avaliadas.
    """
    numerador = 0.0
    denominador = 0.0
    avaliaveis = 0

    for motivo in motivos:
        if motivo.valor_normalizado is None:
            continue
        numerador += motivo.pontos
        denominador += motivo.peso
        avaliaveis += 1

    pontuacao = min(100.0, max(0.0, numerador / denominador)) if denominador > 0 else 0.0
    cobertura = avaliaveis / len(motivos) if motivos else 0.0

    return ResultadoPredicao(
        entidade_id=entidade_id,
        pontuacao=arredondar(pontuacao, 3),
        faixa_risco=faixa_risco_do_score(pontuacao, 100),
        cobertura=arredondar(cobertura, 4),
        valor_impacto=valor_impacto,
        motivos=motivos,
    )
