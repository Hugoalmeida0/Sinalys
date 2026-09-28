"""Cliente HTTP da OpenRouter (API compatível com a da OpenAI)."""

import json
import re
from collections.abc import Iterator

import httpx

from app.config import obter_settings
from app.errors import ErroConfiguracao

URL_CHAT = "https://openrouter.ai/api/v1/chat/completions"
TIMEOUT_S = httpx.Timeout(55.0, connect=10.0)


class ErroLlm(RuntimeError):
    def __init__(self, mensagem: str, status: int | None = None):
        super().__init__(mensagem)
        self.status = status


def _cabecalhos() -> dict:
    s = obter_settings()
    if not s.openrouter_api_key:
        raise ErroConfiguracao("Variável de ambiente OPENROUTER_API_KEY ausente — necessária para a IA.")
    return {
        "Authorization": f"Bearer {s.openrouter_api_key}",
        "HTTP-Referer": s.app_url,
        "X-Title": "Sinalys",
    }


def _falhar(resposta: httpx.Response) -> None:
    raise ErroLlm(f"OpenRouter respondeu HTTP {resposta.status_code}: {resposta.text[:500]}", resposta.status_code)


def completar(modelo: str, mensagens: list[dict], **extras) -> dict:
    """Uma chamada síncrona; devolve a mensagem do assistente."""
    resposta = httpx.post(
        URL_CHAT, headers=_cabecalhos(), json={"model": modelo, "messages": mensagens, **extras}, timeout=TIMEOUT_S
    )
    if resposta.status_code >= 400:
        _falhar(resposta)
    corpo = resposta.json()
    if corpo.get("error"):
        raise ErroLlm(f"OpenRouter: {corpo['error'].get('message', corpo['error'])}")
    escolhas = corpo.get("choices") or []
    if not escolhas:
        raise ErroLlm("OpenRouter devolveu resposta sem conteúdo.")
    return escolhas[0].get("message") or {}


def extrair_json(texto: str) -> dict:
    """Aceita JSON puro ou dentro de bloco de código — modelos gratuitos nem sempre respeitam o formato."""
    bruto = texto.strip()
    cercado = re.search(r"```(?:json)?\s*(.*?)```", bruto, re.S)
    if cercado:
        bruto = cercado.group(1).strip()
    if not bruto.startswith("{"):
        inicio, fim = bruto.find("{"), bruto.rfind("}")
        if inicio != -1 and fim > inicio:
            bruto = bruto[inicio : fim + 1]
    return json.loads(bruto)


def gerar_objeto(modelo: str, sistema: str, prompt: str, nome_schema: str, schema: dict) -> dict:
    """Pede saída estruturada (``response_format: json_schema``) e devolve o objeto decodificado."""
    mensagens = [{"role": "system", "content": sistema}, {"role": "user", "content": prompt}]
    formato = {"type": "json_schema", "json_schema": {"name": nome_schema, "strict": True, "schema": schema}}
    try:
        mensagem = completar(modelo, mensagens, response_format=formato)
    except ErroLlm as erro:
        # Nem todo modelo aceita json_schema; nesses, o schema vai no próprio prompt.
        if erro.status not in (400, 422):
            raise
        instrucao = (
            "\n\nResponda APENAS com um objeto JSON válido, sem texto antes ou depois, que siga este JSON Schema:\n"
            + json.dumps(schema, ensure_ascii=False)
        )
        mensagens[0]["content"] = sistema + instrucao
        mensagem = completar(modelo, mensagens)
    return extrair_json(mensagem.get("content") or "")


def transmitir(modelo: str, mensagens: list[dict], ferramentas: list[dict]) -> Iterator[dict]:
    """Chat em streaming (SSE). Emite ``{"texto": ...}`` a cada trecho e, no fim, ``{"tool_calls": [...]}``."""
    corpo = {"model": modelo, "messages": mensagens, "tools": ferramentas, "stream": True}
    chamadas: dict[int, dict] = {}

    with httpx.stream("POST", URL_CHAT, headers=_cabecalhos(), json=corpo, timeout=TIMEOUT_S) as resposta:
        if resposta.status_code >= 400:
            resposta.read()
            _falhar(resposta)
        for linha in resposta.iter_lines():
            if not linha.startswith("data:"):
                continue  # comentários de keep-alive da OpenRouter
            dado = linha[5:].strip()
            if dado == "[DONE]":
                break
            evento = json.loads(dado)
            if evento.get("error"):
                raise ErroLlm(f"OpenRouter: {evento['error'].get('message', evento['error'])}")
            for escolha in evento.get("choices") or []:
                delta = escolha.get("delta") or {}
                if delta.get("content"):
                    yield {"texto": delta["content"]}
                for parcial in delta.get("tool_calls") or []:
                    atual = chamadas.setdefault(
                        parcial.get("index", 0), {"id": "", "type": "function", "function": {"name": "", "arguments": ""}}
                    )
                    if parcial.get("id"):
                        atual["id"] = parcial["id"]
                    funcao = parcial.get("function") or {}
                    if funcao.get("name"):
                        atual["function"]["name"] += funcao["name"]
                    if funcao.get("arguments"):
                        atual["function"]["arguments"] += funcao["arguments"]

    if chamadas:
        yield {"tool_calls": [chamadas[i] for i in sorted(chamadas)]}
