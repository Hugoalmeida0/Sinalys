"""Contingência por regras: diagnóstico montado só com o que o motor calculou.

Entra quando a LLM falha (cota, timeout, resposta fora do contrato). Não gera
texto livre — descreve os sinais de maior contribuição e transforma cada um em
uma ação de investigação.
"""

from app.services.ia.contexto import ContextoAtual
from app.services.ia.esquema import Diagnostico
from app.services.ia.lookalike import CasoSimilar
from app.utils.numeros import js_str, to_fixed

MODELO_IA_FALLBACK = "fallback-regras"


def gerar_diagnostico_fallback(contexto: ContextoAtual, casos_similares: list[CasoSimilar]) -> Diagnostico:
    acionados = sorted((s for s in contexto.sinais if s.acionado is True), key=lambda s: -s.pontos)
    faixa = contexto.faixa_risco or "indefinida"
    rodape = "Diagnóstico gerado por regras do motor de risco (IA indisponível no momento)."

    if acionados:
        principal = acionados[0]
        diagnostico_principal = (
            f"Principal ofensor: {principal.metrica} (peso {js_str(principal.peso)}, "
            f"{to_fixed(principal.pontos, 1)} pontos de contribuição). "
            f"Score de risco atual: {to_fixed(contexto.pontuacao, 1)}/100 (faixa {faixa}). {rodape}"
        )
    else:
        diagnostico_principal = (
            f"Nenhum sinal de risco individual foi acionado, mas o score combinado é "
            f"{to_fixed(contexto.pontuacao, 1)}/100 (faixa {faixa}). {rodape}"
        )

    if casos_similares:
        maxima = max(c.similaridade for c in casos_similares) * 100
        analise_lookalike = (
            f"{len(casos_similares)} caso(s) histórico(s) com perfil parecido foram encontrados na base "
            f"(similaridade máxima {to_fixed(maxima, 0)}%), mas a leitura comparativa detalhada exige o analista "
            "de IA, que está indisponível no momento."
        )
    else:
        analise_lookalike = "Nenhum caso histórico similar foi encontrado na base vetorial."

    plano = []
    for s in acionados[:5]:
        if (s.valor_observado or {}).get("omissao") is True:
            plano.append(
                f'Verificar com o cliente por que "{s.metrica}" deixou de ser reportado e reativar o acompanhamento.'
            )
        else:
            plano.append(
                f'Investigar e agir sobre "{s.metrica}", sinal com maior contribuição de risco '
                f"({to_fixed(s.pontos, 1)} pontos)."
            )

    return Diagnostico(
        diagnostico_principal=diagnostico_principal,
        analise_lookalike=analise_lookalike,
        plano_acao_imediato=plano or ["Revisar manualmente a conta: nenhum sinal individual foi acionado pelo motor."],
    )
