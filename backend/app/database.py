"""Acesso ao Supabase: clientes, paginação e execução paralela de consultas.

O backend fala com o banco usando a chave service-role (ignora RLS), como as
rotas originais faziam; quem garante o acesso é a sessão validada na borda da
API (``app.controllers.dependencias``).
"""

from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from typing import Any, TypeVar

import httpx
from supabase import Client, create_client
from supabase.lib.client_options import SyncClientOptions

from app.config import obter_settings
from app.errors import ErroConfiguracao

TAMANHO_PAGINA = 1000

T = TypeVar("T")

_executor = ThreadPoolExecutor(max_workers=16, thread_name_prefix="consulta")


@lru_cache
def cliente_admin() -> Client:
    s = obter_settings()
    if not s.supabase_url or not s.supabase_service_role_key:
        raise ErroConfiguracao(
            "Variáveis de ambiente do Supabase ausentes (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
        )
    # HTTP/1.1 com pool: o padrão do SDK (uma conexão HTTP/2 compartilhada)
    # derruba a conexão quando várias threads consultam ao mesmo tempo.
    http = httpx.Client(
        http2=False,
        timeout=httpx.Timeout(60.0, connect=10.0),
        limits=httpx.Limits(max_connections=32, max_keepalive_connections=16),
    )
    return create_client(
        s.supabase_url,
        s.supabase_service_role_key,
        options=SyncClientOptions(auto_refresh_token=False, persist_session=False, httpx_client=http),
    )


def cliente_publico() -> Client:
    """Cliente com a chave anon, para login e refresh de sessão.

    Um cliente novo por chamada: o SDK guarda a sessão dentro da instância, e
    compartilhá-la entre requisições misturaria usuários.
    """
    s = obter_settings()
    if not s.supabase_url or not s.supabase_anon_key:
        raise ErroConfiguracao(
            "Variáveis de ambiente do Supabase ausentes (SUPABASE_URL / SUPABASE_ANON_KEY)."
        )
    return create_client(
        s.supabase_url,
        s.supabase_anon_key,
        options=SyncClientOptions(auto_refresh_token=False, persist_session=False),
    )


def buscar_todas_linhas(montar: Callable[[], Any]) -> list[dict]:
    """Percorre todas as páginas de uma consulta (o PostgREST corta em 1000 linhas)."""
    linhas: list[dict] = []
    inicio = 0
    while True:
        resposta = montar().range(inicio, inicio + TAMANHO_PAGINA - 1).execute()
        pagina = resposta.data or []
        linhas.extend(pagina)
        if len(pagina) < TAMANHO_PAGINA:
            return linhas
        inicio += TAMANHO_PAGINA


def primeira_linha(consulta: Any) -> dict | None:
    """Equivalente ao ``maybeSingle()`` do SDK JS, sem depender da versão do SDK Python."""
    resposta = consulta.limit(1).execute()
    dados = resposta.data or []
    return dados[0] if dados else None


def em_lotes(itens: list[T], tamanho: int) -> list[list[T]]:
    return [itens[i : i + tamanho] for i in range(0, len(itens), tamanho)]


def em_paralelo(*funcoes: Callable[[], Any]) -> list[Any]:
    """Roda consultas independentes ao mesmo tempo (o ``Promise.all`` das rotas originais)."""
    futuros = [_executor.submit(f) for f in funcoes]
    return [f.result() for f in futuros]
