"""Assistente conversacional: loop de tool-calling na OpenRouter com resposta em streaming.

Cada evento enviado ao frontend é uma linha JSON (NDJSON):

- ``{"tipo": "ferramenta", "id", "nome", "estado": "executando" | "concluida" | "erro"}``
- ``{"tipo": "texto", "delta": "..."}``
- ``{"tipo": "erro", "mensagem": "..."}``
- ``{"tipo": "fim"}``
"""

import json
import logging
import re
import time
from collections.abc import Iterator
from datetime import datetime

from app.config import obter_settings
from app.services.ia.chat_ferramentas import FERRAMENTAS, EscopoFerramentas, executar_ferramenta
from app.services.ia.openrouter import ErroLlm, transmitir
from app.utils.formatacao import FUSO_BRASIL, data_extenso_ptbr

log = logging.getLogger("sinalys.chat")

MAX_MENSAGENS_CONTEXTO = 20
MAX_PASSOS = 5
TENTATIVAS_POR_PASSO = 2
ESPERA_ENTRE_TENTATIVAS_S = 2


def _transitorio(erro: ErroLlm) -> bool:
    return (erro.status or 0) in (429, 500, 502, 503, 504) or bool(
        re.search(r"overloaded|temporarily|timeout|rate.?limit", str(erro), re.I)
    )


def descrever_tela(tela: dict | None) -> str:
    caminho = (tela or {}).get("caminho") or "/"
    cliente_id = (tela or {}).get("clienteId")
    if cliente_id:
        return (
            f'Detalhe do cliente {cliente_id}. Quando o analista disser "este cliente", "ele" ou não nomear '
            f"ninguém, é o {cliente_id}."
        )
    if caminho.startswith("/clientes"):
        return "Lista de clientes da carteira."
    if caminho.startswith("/ingestao"):
        return "Ingestão de planilhas (upload e mapeamento De-Para de colunas)."
    if caminho.startswith("/configuracoes"):
        return "Configurações do modelo de risco (pesos e regras)."
    if caminho.startswith("/playbook"):
        return "Playbook de ações de Customer Success."
    if caminho.startswith("/relatorios"):
        return "Relatórios."
    if caminho.startswith("/recuperacao"):
        return "Campanha de recuperação (clientes que já cancelaram)."
    return "Início (painel com KPIs e fila do dia)."


def montar_prompt_sistema(nome_usuario: str, rotulo_entidade: str, tela: dict | None, agora: datetime | None = None) -> str:
    agora = agora or datetime.now(FUSO_BRASIL)
    return f"""Você é a Sinalys, assistente de Customer Success de uma plataforma de prevenção de churn. Está conversando com {nome_usuario}, analista de CS, que precisa decidir com quem falar e o que fazer. Hoje é {data_extenso_ptbr(agora)}.

## Como a plataforma funciona (para você explicar quando perguntarem)
- Um motor matemático determinístico calcula, para cada {rotulo_entidade.lower()}, um score de risco de 0 a 100 a partir de sinais (métricas) com pesos configurados. Faixas: crítico (acima de 50), alerta (35 a 50), atenção (25 a 35) e saudável (abaixo de 25). O score é um índice operacional, ainda sem validação estatística: NUNCA o chame de probabilidade nem fale em "perda esperada".
- Sinais são comparados com a carteira (z-score) e com o histórico do próprio cliente (média móvel). Ausência de dado só vira risco quando a regra tem pontuação de omissão configurada; sem isso, a regra fica não avaliável e reduz a cobertura.
- Prioridade = score de risco × (0,5 + impacto financeiro relativo da conta na carteira). É o que ordena a fila do dia. É um número adimensional de ordenação: NUNCA o apresente como valor em reais. O que é dinheiro é o MRR (receita mensal).
- "Exposição" é o MRR anualizado ponderado pelo score (MRR × 12 × score/100): mede quanto da receita está sob risco, não é previsão de perda.
- "Cobertura" é a fração das regras que puderam ser avaliadas. Score 0 com cobertura 0 significa que o motor está cego, não que o cliente está bem.
- Existe uma memória de casos passados (ação tomada + desfecho) que permite achar clientes parecidos.

## Tela atual do analista
{descrever_tela(tela)}

## Regras
1. Antes de afirmar qualquer coisa sobre clientes, números ou risco, consulte as ferramentas. Nunca responda de memória nem invente clientes, valores, datas ou contatos. Se a ferramenta devolver erro ou vazio, diga isso.
2. Seja prescritiva: o analista quer saber o que fazer. Sugira ações concretas (quem contatar, sobre o quê, com que objetivo, em que prazo), ancoradas nos sinais e no histórico. Evite conselhos vagos como "monitorar", "acompanhar de perto" ou "reforçar o relacionamento".
3. Quando houver casos similares no histórico, use-os: diga o que foi feito e o que aconteceu. Descreva cada caso pelo que ele realmente contém; não atribua sinais que ele não tem nem extrapole percentuais de dois ou três casos.
4. Se um cliente está silenciado, tem contato recente ou já tem diagnóstico de IA, mencione — evita retrabalho. Quando existir diagnóstico de IA salvo, resuma-o em 2 ou 3 linhas (ofensor principal + primeira ação) e diga que o plano completo está no card de IA do cliente; não o transcreva inteiro.
5. Você não executa ações: não registra contatos, não altera dados, não gera diagnósticos e não muda scores. Se o analista pedir, explique onde fazer isso no painel (registrar contato na tela do cliente; gerar diagnóstico no card de IA do cliente).
6. Escopo fechado: você só trata de carteira, clientes, risco de churn, ações de Customer Success e uso desta plataforma. Para QUALQUER outro assunto (conhecimentos gerais, geografia, código, receitas, notícias etc.) não responda à pergunta — diga apenas: "Só consigo ajudar com a sua carteira e com a plataforma. Quer que eu veja algum cliente?"

## Formato
- Português do Brasil, tom direto, de colega experiente. Sem saudações repetidas.
- Respostas curtas: o chat é um painel lateral estreito. Até ~120 palavras, salvo quando o analista pedir detalhe.
- Formatação permitida: **negrito** para nomes de clientes e números-chave, listas com "-" ou numeradas. Nada de títulos, tabelas ou blocos de código.
- Valores em reais no formato R$ 1.234. Cite o código do cliente (ex: **C004**) sempre que falar dele."""


def traduzir_erro(mensagem: str) -> str:
    if re.search(r"quota|rate limit|429", mensagem, re.I):
        return "Limite diário de requisições da IA atingido. Tente novamente mais tarde."
    return f"Não consegui responder agora: {mensagem}"


def _evento(**campos) -> str:
    return json.dumps(campos, ensure_ascii=False, default=str) + "\n"


def conversar(
    mensagens: list[dict], escopo: EscopoFerramentas, nome_usuario: str, rotulo_entidade: str, tela: dict | None
) -> Iterator[str]:
    historico = [
        {"role": m["role"], "content": m["content"]}
        for m in mensagens[-MAX_MENSAGENS_CONTEXTO:]
        if m.get("role") in ("user", "assistant") and isinstance(m.get("content"), str) and m["content"].strip()
    ]
    conversa = [{"role": "system", "content": montar_prompt_sistema(nome_usuario, rotulo_entidade, tela)}, *historico]
    definicoes = [f.definicao() for f in FERRAMENTAS.values()]
    modelo = obter_settings().openrouter_modelo_chat

    try:
        for _ in range(MAX_PASSOS):
            texto = ""
            chamadas: list[dict] = []
            for tentativa in range(TENTATIVAS_POR_PASSO):
                try:
                    for parte in transmitir(modelo, conversa, definicoes):
                        if "texto" in parte:
                            texto += parte["texto"]
                            yield _evento(tipo="texto", delta=parte["texto"])
                        else:
                            chamadas = parte["tool_calls"]
                    break
                except ErroLlm as erro:
                    # Provedor gratuito sobrecarregado: repete o passo, desde que nada tenha sido enviado ainda.
                    if texto or tentativa == TENTATIVAS_POR_PASSO - 1 or not _transitorio(erro):
                        raise
                    log.warning("[inteligencia/chat] tentativa %s falhou, repetindo: %s", tentativa + 1, erro)
                    time.sleep(ESPERA_ENTRE_TENTATIVAS_S)

            if not chamadas:
                break

            conversa.append({"role": "assistant", "content": texto or None, "tool_calls": chamadas})
            for chamada in chamadas:
                nome = chamada["function"]["name"]
                yield _evento(tipo="ferramenta", id=chamada["id"], nome=nome, estado="executando")
                try:
                    resultado = executar_ferramenta(nome, chamada["function"]["arguments"], escopo)
                    estado = "concluida"
                except Exception as erro:  # noqa: BLE001 - a falha vira resultado para a LLM explicar
                    log.exception("[inteligencia/chat] ferramenta %s falhou", nome)
                    resultado = {"erro": f"Falha ao consultar dados: {erro}"}
                    estado = "erro"
                yield _evento(tipo="ferramenta", id=chamada["id"], nome=nome, estado=estado)
                conversa.append(
                    {
                        "role": "tool",
                        "tool_call_id": chamada["id"],
                        "content": json.dumps(resultado, ensure_ascii=False, default=str),
                    }
                )
    except Exception as erro:  # noqa: BLE001
        log.error("[inteligencia/chat] %s", erro)
        yield _evento(tipo="erro", mensagem=traduzir_erro(str(erro)))

    yield _evento(tipo="fim")
