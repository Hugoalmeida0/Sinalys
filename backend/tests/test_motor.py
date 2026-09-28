"""Testes do motor determinístico (funções puras, sem banco)."""

from datetime import datetime, timezone

import pytest

from app.services.motor.calcular import limiar_acionado, motivo_omissao, parse_config_regra
from app.services.motor.faixa import faixa_risco_do_score
from app.services.motor.normalizacao import calcular_media_movel, calcular_zscore_carteira
from app.services.motor.score import calcular_predicao_entidade
from app.services.motor.simulador import BaseSimulacao, SinalSimulavel, simular_cenario
from app.services.motor.tipos import ConfigRegra, ObservacaoNumerica, RegraModelo, ResultadoRegra
from app.services.motor.urgencia import (
    FaixaReceita,
    calcular_faixa_receita,
    calcular_impacto_relativo,
    calcular_score_prioridade,
    ordenar_fila_urgencia,
)


@pytest.mark.parametrize(
    ("score", "faixa"),
    [(100, "critico"), (50.01, "critico"), (50, "alerta"), (35, "alerta"), (34.99, "atencao"), (25, "atencao"), (24.9, "saudavel"), (0, "saudavel")],
)
def test_faixas_de_risco(score, faixa):
    assert faixa_risco_do_score(score, 100) == faixa


def test_zscore_carteira_maior_pior():
    resultado = calcular_zscore_carteira({"a": 10, "b": 20, "c": 30}, "maior_pior", clip_z=3)
    # média 20, desvio amostral 10: "c" está 1σ acima (33,3 pts), "a" 1σ abaixo (0 pts — lado bom).
    assert resultado["a"] == 0
    assert resultado["b"] == 0
    assert resultado["c"] == pytest.approx(100 / 3)


def test_zscore_carteira_menor_pior_inverte_o_sentido():
    resultado = calcular_zscore_carteira({"a": 10, "b": 20, "c": 30}, "menor_pior", clip_z=3)
    assert resultado["a"] == pytest.approx(100 / 3)
    assert resultado["c"] == 0


def test_zscore_precisa_de_duas_entidades_e_satura_no_clip():
    assert calcular_zscore_carteira({"a": 10}, "maior_pior") == {}
    resultado = calcular_zscore_carteira({str(i): 0 for i in range(20)} | {"x": 1000}, "maior_pior", clip_z=3)
    assert resultado["x"] == 100


def test_zscore_sem_variacao_nao_pontua():
    assert calcular_zscore_carteira({"a": 5, "b": 5}, "maior_pior") == {"a": 0, "b": 0}


def _serie(valores: list[tuple[str, float]]) -> list[ObservacaoNumerica]:
    return [ObservacaoNumerica("e1", data, valor) for data, valor in valores]


def test_media_movel_queda_de_uso():
    serie = _serie(
        [("2026-01-01T00:00:00+00:00", 90), ("2026-02-01T00:00:00+00:00", 80), ("2026-03-01T00:00:00+00:00", 85), ("2026-06-20T00:00:00+00:00", 40)]
    )
    referencia = datetime(2026, 6, 30, 23, 59, 59, 999000, tzinfo=timezone.utc)
    # histórico 90/80/85 (média 85, σ 5); recente 40 → z = -9 → saturado em menor_pior.
    assert calcular_media_movel(serie, referencia, 30, "menor_pior", 3) == 100
    assert calcular_media_movel(serie, referencia, 30, "maior_pior", 3) == 0


def test_media_movel_sem_historico_suficiente_e_nao_avaliavel():
    serie = _serie([("2026-06-01T00:00:00+00:00", 10), ("2026-06-20T00:00:00+00:00", 40)])
    referencia = datetime(2026, 6, 30, 23, 59, 59, 999000, tzinfo=timezone.utc)
    assert calcular_media_movel(serie, referencia, 30, "maior_pior") is None


def test_media_movel_historico_constante():
    serie = _serie([("2026-01-01T00:00:00+00:00", 5), ("2026-02-01T00:00:00+00:00", 5), ("2026-06-25T00:00:00+00:00", 9)])
    referencia = datetime(2026, 6, 30, 23, 59, 59, 999000, tzinfo=timezone.utc)
    assert calcular_media_movel(serie, referencia, 30, "maior_pior", 3) == 100
    assert calcular_media_movel(serie, referencia, 30, "menor_pior", 3) == 0


def test_score_e_media_ponderada_dos_sinais_avaliaveis():
    motivos = [
        ResultadoRegra("r1", 5, True, {}, 80, 400),
        ResultadoRegra("r2", 3, False, {}, 20, 60),
        ResultadoRegra("r3", 2, None, {"omissao": True}, None, 0),  # não avaliável: fora da média
    ]
    predicao = calcular_predicao_entidade("e1", motivos, 1000.0)
    assert predicao.pontuacao == 57.5  # (400 + 60) / (5 + 3)
    assert predicao.faixa_risco == "critico"
    assert predicao.cobertura == 0.6667
    assert predicao.valor_impacto == 1000.0


def test_score_sem_regras_avaliaveis_e_zero():
    predicao = calcular_predicao_entidade("e1", [ResultadoRegra("r1", 5, None, None, None, 0)], None)
    assert predicao.pontuacao == 0
    assert predicao.cobertura == 0
    assert predicao.faixa_risco == "saudavel"


def test_omissao_sem_configuracao_nao_pontua_e_com_configuracao_vira_sinal():
    base = RegraModelo("r1", "m1", "nps", ConfigRegra("zscore_carteira", "menor_pior"), 2)
    sem = motivo_omissao(base)
    assert (sem.acionado, sem.valor_normalizado, sem.pontos) == (None, None, 0)

    com = motivo_omissao(RegraModelo("r1", "m1", "nps", ConfigRegra("zscore_carteira", "menor_pior", pontuacao_omissao=60), 2))
    assert com.acionado is True  # 60 ≥ limiar de 1σ (33,3)
    assert com.pontos == 120


def test_limiar_acionado_equivale_a_um_desvio():
    assert limiar_acionado(3) == pytest.approx(100 / 3)
    assert limiar_acionado(0.5) == 100


def test_parse_config_regra():
    assert parse_config_regra({"tipo": "zscore_carteira", "direcao": "maior_pior"}).janela_observacoes == 3
    assert parse_config_regra({"tipo": "zscore_carteira", "direcao": "maior_pior", "janela_observacoes": 2.7}).janela_observacoes == 2
    assert parse_config_regra({"tipo": "media_movel", "direcao": "menor_pior"}).janela_dias == 30
    assert parse_config_regra({"tipo": "media_movel", "direcao": "lateral"}) is None
    assert parse_config_regra({"tipo": "outro", "direcao": "maior_pior"}) is None
    assert parse_config_regra({"tipo": "zscore_carteira", "direcao": "maior_pior", "pontuacao_omissao": True}).pontuacao_omissao is None


def test_impacto_relativo_e_prioridade():
    faixa = calcular_faixa_receita([1000, 10000, None, 0, 100000])
    assert faixa == FaixaReceita(1000, 100000)
    assert calcular_impacto_relativo(10000, faixa) == pytest.approx(0.5)
    assert calcular_impacto_relativo(None, faixa, "Médio") == 0.5
    assert calcular_impacto_relativo(None, faixa, "Grande") == 0.75
    assert calcular_impacto_relativo(None, faixa, None) == 0.5
    # A prioridade modula o risco entre 0,5× e 1,5× e nunca passa de 100.
    assert calcular_score_prioridade(60, 0) == 30
    assert calcular_score_prioridade(60, 1) == 90
    assert calcular_score_prioridade(80, 1) == 100


def test_fila_urgencia_legada():
    fila = ordenar_fila_urgencia(
        [
            {"entidade_id": "a", "pontuacao": 90, "valor_impacto": None},
            {"entidade_id": "b", "pontuacao": 10, "valor_impacto": 1000},
            {"entidade_id": "c", "pontuacao": 50, "valor_impacto": 1000},
        ]
    )
    assert [p["entidade_id"] for p in fila] == ["c", "b", "a"]


def test_simulador_usa_a_mesma_media_ponderada():
    base = BaseSimulacao(
        score_risco=58,
        soma_pesos=8,
        mrr=10000,
        impacto_relativo=0.5,
        sinais=[SinalSimulavel("uso", "Uso", 5, 400, ""), SinalSimulavel("sla", "SLA", 3, 60, "")],
    )
    resultado = simular_cenario(base, {"uso": 100})
    assert resultado["scoreDepois"] == 8  # 58 - 400/8
    assert resultado["faixaAntes"] == "critico" and resultado["faixaDepois"] == "saudavel"
    assert resultado["receitaRiscoAntes"] == 69600  # exposição: 10000 × 12 × 0,58
    assert resultado["receitaRiscoDepois"] == 9600
