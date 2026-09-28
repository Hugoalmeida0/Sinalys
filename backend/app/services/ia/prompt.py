"""Prompts do diagnóstico. A LLM recebe só fatos: o que o motor calculou e o que o histórico registra."""

from app.services.ia.contexto import ContextoAtual
from app.services.ia.lookalike import CasoSimilar
from app.utils.formatacao import formatar_moeda_brl_compacta
from app.utils.numeros import js_str, to_fixed

PROMPT_SISTEMA = """Você é um gestor sênior de Customer Success analisando risco de churn em uma carteira B2B.

Escreva em português do Brasil, em tom direto e profissional, dirigido a um analista que vai agir hoje.

Regras invioláveis:
- Baseie-se exclusivamente nos dados fornecidos. Nunca invente métricas, números, datas, nomes ou fatos que não estejam no contexto.
- Cite os sinais concretos que sustentam sua conclusão, com os valores observados.
- Se um sinal foi acionado por AUSÊNCIA de dado, trate a omissão como o sinal que ela é (cliente parou de reportar ou usar o produto), não como erro de sistema.
- Se nenhum caso histórico similar foi fornecido, diga isso com todas as letras em "analise_lookalike" e não simule uma comparação.
- O plano de ação deve conter passos executáveis e específicos (quem contatar, sobre o quê, com que objetivo). Proibido escrever conselhos vagos como "monitorar de perto", "acompanhar o cliente" ou "reforçar o relacionamento".
- Não prometa resultados nem garanta retenção.
- O score de risco é um índice operacional de 0 a 100 calculado pelo motor, sem validação estatística: nunca o apresente como probabilidade nem converta valores em perda prevista. O valor em reais associado ao score é "exposição".
- Em "plano_acao_imediato", cada item é o texto puro de uma ação. Não comece o item com número, marcador ou "1." — a numeração é feita por quem exibe a lista.
- Ao comparar com casos históricos, descreva cada caso pelo que o texto dele realmente contém. Não atribua a um caso sinais que ele não apresenta, e não extrapole percentuais a partir de dois ou três casos."""


def _formatar_sinais(contexto: ContextoAtual) -> str:
    if not contexto.sinais:
        return "Nenhuma regra de modelo foi avaliada para este cliente."

    linhas = []
    for sinal in contexto.sinais:
        observado = sinal.valor_observado or {}
        valor = observado.get("valor") if observado.get("valor") is not None else observado.get("ultimo_valor")
        valor_txt = "n/d" if valor is None else js_str(valor)
        unidade = f" {sinal.unidade}" if sinal.unidade else ""

        if sinal.acionado is None:
            situacao = "NÃO AVALIÁVEL (dados insuficientes para comparação estatística)"
        elif observado.get("omissao") is True:
            situacao = "ACIONADO POR OMISSÃO (nenhum dado reportado para esta métrica)"
        elif sinal.acionado:
            situacao = f"ACIONADO (valor observado: {valor_txt}{unidade})"
        else:
            situacao = f"dentro do normal (valor observado: {valor_txt}{unidade})"

        linhas.append(
            f"- {sinal.metrica} [{sinal.codigo_sinal}] — {situacao}. "
            f"Peso {js_str(sinal.peso)}, contribuição {to_fixed(sinal.pontos, 1)} pontos."
        )
    return "\n".join(linhas)


def _formatar_casos(casos: list[CasoSimilar]) -> str:
    if not casos:
        return (
            "NENHUM caso histórico similar foi encontrado na base vetorial. Não há comparação possível — "
            "declare isso explicitamente."
        )
    blocos = []
    for indice, caso in enumerate(casos):
        nome = caso.nome_exibicao or "cliente não identificado"
        blocos.append(
            "\n".join(
                [
                    f"### Caso {indice + 1} — {nome} (similaridade {to_fixed(caso.similaridade * 100, 0)}%)",
                    f"Perfil na época:\n{caso.contexto_texto}",
                    f"Ação tomada pelo time: {caso.acao_realizada}",
                    f"Desfecho: {caso.desfecho.upper()}",
                ]
            )
        )
    return "\n\n".join(blocos)


def montar_prompt_usuario(contexto: ContextoAtual, casos_similares: list[CasoSimilar]) -> str:
    nome = contexto.nome_exibicao or contexto.id_externo
    cabecalho = [
        f"## Contexto atual ({contexto.rotulo_entidade}: {nome})",
        f"Data de referência da análise: {contexto.referencia_em}",
        f"Score de risco: {to_fixed(contexto.pontuacao, 1)}/100 (faixa: {contexto.faixa_risco or 'indefinida'})",
        (
            f"Receita mensal (MRR) exposta: {formatar_moeda_brl_compacta(contexto.valor_impacto)}"
            if contexto.valor_impacto is not None
            else "Receita mensal: não mapeada para este cliente."
        ),
    ]
    if contexto.cobertura is not None:
        cabecalho.append(
            f"Cobertura do modelo: {to_fixed(contexto.cobertura * 100, 0)}% das regras puderam ser avaliadas."
        )

    blocos = [
        "\n".join(cabecalho),
        "\n".join(["### Sinais avaliados pelo motor", _formatar_sinais(contexto)]),
        "\n".join(
            ["## Contexto histórico (casos similares da própria base da empresa)", _formatar_casos(casos_similares)]
        ),
        "## Sua tarefa\nProduza o diagnóstico do principal ofensor, a leitura do que o histórico sugere e o plano de "
        "ação imediato.",
    ]
    return "\n\n".join(blocos)
