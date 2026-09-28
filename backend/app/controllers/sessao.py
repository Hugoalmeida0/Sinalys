"""Sessão HTTP: cookies httpOnly com os tokens do Supabase Auth.

O navegador nunca vê o token (ele vive em cookie httpOnly). Quando o access
token expira, o refresh token renova a sessão de forma transparente.
"""

from dataclasses import dataclass

from fastapi import Depends, Request, Response

from app.config import obter_settings
from app.errors import NaoAutenticado
from app.services import sessao as sessao_service
from app.services.sessao import SessaoAberta, UsuarioSessao

COOKIE_ACESSO = "sinalys_access"
COOKIE_RENOVACAO = "sinalys_refresh"
TRINTA_DIAS = 60 * 60 * 24 * 30


def gravar_cookies(response: Response, sessao: SessaoAberta) -> None:
    seguro = obter_settings().cookie_secure
    for nome, valor in ((COOKIE_ACESSO, sessao.access_token), (COOKIE_RENOVACAO, sessao.refresh_token)):
        response.set_cookie(nome, valor, max_age=TRINTA_DIAS, httponly=True, samesite="lax", secure=seguro, path="/")


def apagar_cookies(response: Response) -> None:
    for nome in (COOKIE_ACESSO, COOKIE_RENOVACAO):
        response.delete_cookie(nome, path="/")


def _token_da_requisicao(request: Request) -> str | None:
    cabecalho = request.headers.get("authorization", "")
    if cabecalho.lower().startswith("bearer "):
        return cabecalho[7:].strip()
    return request.cookies.get(COOKIE_ACESSO)


def usuario_opcional(request: Request, response: Response) -> UsuarioSessao | None:
    usuario = sessao_service.usuario_do_token(_token_da_requisicao(request))
    if usuario:
        return usuario
    renovada = sessao_service.renovar(request.cookies.get(COOKIE_RENOVACAO))
    if renovada:
        gravar_cookies(response, renovada)
        return renovada.usuario
    return None


def usuario_obrigatorio(usuario: UsuarioSessao | None = Depends(usuario_opcional)) -> UsuarioSessao:
    if not usuario:
        raise NaoAutenticado("Sessão inválida.")
    return usuario


@dataclass
class Contexto:
    usuario: UsuarioSessao
    projeto_id: str


def contexto_projeto(request: Request, usuario: UsuarioSessao = Depends(usuario_obrigatorio)) -> Contexto:
    """Projeto do usuário; ``?projeto_id=`` só vale para usuário sem projeto vinculado (como na API original)."""
    return Contexto(usuario, sessao_service.resolver_projeto_id(usuario, request.query_params.get("projeto_id")))


def projeto_do_corpo(contexto: Contexto, dados: dict) -> str:
    return sessao_service.resolver_projeto_id(contexto.usuario, dados.get("projeto_id") or contexto.projeto_id)
