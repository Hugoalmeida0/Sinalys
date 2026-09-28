"""Textos que descrevem o perfil de risco (entrada dos embeddings e da memória de casos)."""

from app.services.ia.contexto import ContextoAtual, SinalRisco
from app.utils.numeros import js_str, to_fixed


def _formatar_numero(valor) -> str:
    if isinstance(valor, (int, float)) and not isinstance(valor, bool):
        return js_str(valor) if float(valor).is_integer() else to_fixed(valor, 2)
    return js_str(valor)


def _descrever_sinal(sinal: SinalRisco) -> str:
    observado = sinal.valor_observado or {}
    if observado.get("omissao") is True:
        return f"{sinal.metrica}: sem dado reportado (omissão tratada como risco)."

    valor = observado.get("valor") if observado.get("valor") is not None else observado.get("ultimo_valor")
    sufixo = f" {sinal.unidade}" if sinal.unidade else ""
    trecho = "valor não informado" if valor is None else f"valor observado {_formatar_numero(valor)}{sufixo}"
    return f"{sinal.metrica}: {trecho} (peso {js_str(sinal.peso)}, contribuiu {to_fixed(sinal.pontos, 1)} pontos)."


def descrever_perfil_risco(contexto: ContextoAtual) -> str:
    linhas = [
        f"Faixa de risco: {contexto.faixa_risco or 'indefinida'}.",
        f"Score de risco: {to_fixed(contexto.pontuacao, 1)} de 100.",
    ]
    acionados = [s for s in contexto.sinais if s.acionado is True]
    nao_avaliaveis = [s for s in contexto.sinais if s.acionado is None]

    if acionados:
        linhas.append("Sinais de risco detectados:")
        linhas.extend(f"- {_descrever_sinal(s)}" for s in acionados)
    else:
        linhas.append("Nenhum sinal de risco acionado.")

    if nao_avaliaveis:
        linhas.append(f"Sinais sem dados suficientes para avaliação: {', '.join(s.metrica for s in nao_avaliaveis)}.")
    return "\n".join(linhas)


def descrever_caso_historico(perfil_risco: str, acao_realizada: str, desfecho: str) -> str:
    return "\n".join(
        [
            perfil_risco,
            f"Ação realizada pelo time de Customer Success: {acao_realizada}",
            f"Desfecho observado: {desfecho}.",
        ]
    )
