"""Contingência por regras e pós-processamento da saída da LLM (sem rede)."""

from app.services.ia.analise import normalizar_diagnostico
from app.services.ia.contexto import ContextoAtual, SinalRisco
from app.services.ia.esquema import Diagnostico
from app.services.ia.fallback import gerar_diagnostico_fallback
from app.services.ia.lookalike import CasoSimilar
from app.services.ia.openrouter import extrair_json


def _contexto(sinais: list[SinalRisco]) -> ContextoAtual:
    return ContextoAtual(
        entidade_id="e1",
        id_externo="C004",
        nome_exibicao="Cliente",
        rotulo_entidade="Cliente",
        predicao_id="p1",
        referencia_em="2026-06-30T00:00:00+00:00",
        pontuacao=62.25,
        faixa_risco="critico",
        cobertura=1,
        valor_impacto=1000,
        score_urgencia=62250,
        sinais=sinais,
    )


def test_fallback_usa_os_sinais_de_maior_contribuicao():
    sinais = [
        SinalRisco("uso", "Uso da plataforma", "%", True, {"valor": 40}, 5, 400),
        SinalRisco("nps", "NPS", None, True, {"omissao": True}, 2, 120),
        SinalRisco("sla", "SLA", "%", False, {"valor": 95}, 3, 0),
    ]
    diagnostico = gerar_diagnostico_fallback(_contexto(sinais), [])
    assert diagnostico.diagnostico_principal.startswith("Principal ofensor: Uso da plataforma (peso 5, 400.0 pontos")
    assert "62.3/100 (faixa critico)" in diagnostico.diagnostico_principal
    assert diagnostico.analise_lookalike == "Nenhum caso histórico similar foi encontrado na base vetorial."
    assert diagnostico.plano_acao_imediato == [
        'Investigar e agir sobre "Uso da plataforma", sinal com maior contribuição de risco (400.0 pontos).',
        'Verificar com o cliente por que "NPS" deixou de ser reportado e reativar o acompanhamento.',
    ]


def test_fallback_sem_sinais_acionados():
    diagnostico = gerar_diagnostico_fallback(_contexto([]), [CasoSimilar("c", "e2", None, "", "", "recuperado", 0.815, "")])
    assert diagnostico.plano_acao_imediato == ["Revisar manualmente a conta: nenhum sinal individual foi acionado pelo motor."]
    assert "similaridade máxima 82%" in diagnostico.analise_lookalike


def test_normalizar_remove_numeracao_embutida():
    bruto = Diagnostico(diagnostico_principal="x", analise_lookalike="y", plano_acao_imediato=["1. Ligar", "- Enviar", "2) Revisar"])
    assert normalizar_diagnostico(bruto).plano_acao_imediato == ["Ligar", "Enviar", "Revisar"]


def test_extrair_json_de_bloco_de_codigo():
    assert extrair_json('Aqui está:\n```json\n{"a": 1}\n```') == {"a": 1}
    assert extrair_json('texto {"a": 2} fim') == {"a": 2}
