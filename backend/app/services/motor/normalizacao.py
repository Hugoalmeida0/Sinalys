"""Normalização dos sinais para a escala 0–100 de alerta.

- ``calcular_zscore_carteira``: compara a entidade com a carteira inteira.
- ``calcular_media_movel``: compara o período recente da entidade com o próprio histórico.

Nos dois casos o desvio ("badness") é cortado em ``clip_z`` desvios-padrão e
reescalado para 0–100; desvio no sentido bom vale zero.
"""

import math
from datetime import datetime

from app.services.motor.constantes import PADRAO_CLIP_Z
from app.services.motor.tipos import ObservacaoNumerica

MS_POR_DIA = 24 * 60 * 60 * 1000


def media(valores: list[float]) -> float:
    return sum(valores) / len(valores)


def desvio_padrao_amostral(valores: list[float], media_valores: float) -> float:
    if len(valores) < 2:
        return 0.0
    soma_quadrados = sum((v - media_valores) ** 2 for v in valores)
    return math.sqrt(soma_quadrados / (len(valores) - 1))


def escalar_badness(badness: float, clip_z: float) -> float:
    clampeada = min(max(badness, 0.0), clip_z)
    return (clampeada / clip_z) * 100


def calcular_zscore_carteira(
    valores_por_entidade: dict[str, float], direcao: str, clip_z: float = PADRAO_CLIP_Z
) -> dict[str, float]:
    resultado: dict[str, float] = {}
    valores = list(valores_por_entidade.values())
    if len(valores) < 2:
        return resultado

    media_carteira = media(valores)
    desvio_carteira = desvio_padrao_amostral(valores, media_carteira)

    for entidade_id, valor in valores_por_entidade.items():
        if desvio_carteira == 0:
            badness = 0.0
        else:
            z = (valor - media_carteira) / desvio_carteira
            badness = z if direcao == "maior_pior" else -z
        resultado[entidade_id] = escalar_badness(badness, clip_z)
    return resultado


def em_ms(momento: datetime) -> int:
    """Milissegundos desde a época, truncados como no ``Date.getTime()`` do JS."""
    return int(momento.replace(microsecond=0).timestamp()) * 1000 + momento.microsecond // 1000


def _iso_em_ms(iso: str) -> int:
    return em_ms(datetime.fromisoformat(iso.replace("Z", "+00:00")))


def calcular_media_movel(
    observacoes_ordenadas: list[ObservacaoNumerica],
    referencia_em: datetime,
    janela_dias: float,
    direcao: str,
    clip_z: float = PADRAO_CLIP_Z,
) -> float | None:
    limite_janela_ms = em_ms(referencia_em) - janela_dias * MS_POR_DIA

    historico: list[float] = []
    recentes: list[float] = []
    for obs in observacoes_ordenadas:
        if _iso_em_ms(obs.observado_em) < limite_janela_ms:
            historico.append(obs.valor_numero)
        else:
            recentes.append(obs.valor_numero)

    if len(historico) < 2 or not recentes:
        return None

    media_historico = media(historico)
    desvio_historico = desvio_padrao_amostral(historico, media_historico)
    media_recente = media(recentes)

    if desvio_historico == 0:
        badness = 0.0 if media_recente == media_historico else float(clip_z)
        if direcao == "maior_pior" and media_recente < media_historico:
            badness = 0.0
        if direcao == "menor_pior" and media_recente > media_historico:
            badness = 0.0
    else:
        z = (media_recente - media_historico) / desvio_historico
        badness = z if direcao == "maior_pior" else -z

    return escalar_badness(badness, clip_z)
