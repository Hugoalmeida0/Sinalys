"""Sessão do usuário (Supabase Auth) e resolução do projeto ativo."""

import re
import threading
import time
from dataclasses import dataclass
from typing import Any

from app.config import obter_settings
from app.errors import ErroConfiguracao, ErroValidacao, NaoAutenticado
from app.models import auth as auth_model

VALIDADE_CACHE_TOKEN_S = 60


@dataclass
class UsuarioSessao:
    id: str
    email: str
    nome: str
    cargo: str | None
    iniciais: str
    projetoId: str | None  # noqa: N815 - contrato JSON da API

    def para_dict(self) -> dict:
        return self.__dict__.copy()


@dataclass
class SessaoAberta:
    usuario: UsuarioSessao
    access_token: str
    refresh_token: str


def montar_usuario(user: Any) -> UsuarioSessao:
    email = getattr(user, "email", None) or ""
    metadados = getattr(user, "user_metadata", None) or {}
    app_metadados = getattr(user, "app_metadata", None) or {}

    nome_meta = metadados.get("nome")
    nome = (nome_meta.strip() if isinstance(nome_meta, str) else "") or email.split("@")[0] or "Usuário"
    partes = [p for p in re.split(r"\s+", nome) if p]
    iniciais = (partes[0][0] if partes else "") + (partes[-1][0] if len(partes) > 1 else "")

    cargo = metadados.get("cargo")
    projeto_id = app_metadados.get("projeto_id")
    return UsuarioSessao(
        id=user.id,
        email=email,
        nome=nome,
        cargo=cargo if isinstance(cargo, str) else None,
        iniciais=iniciais.upper() or "?",
        projetoId=projeto_id if isinstance(projeto_id, str) else None,
    )


_cache_tokens: dict[str, tuple[float, UsuarioSessao]] = {}
_trava = threading.Lock()


def usuario_do_token(access_token: str | None) -> UsuarioSessao | None:
    """Valida o token no Supabase, com cache curto para não pagar uma ida à rede por requisição."""
    if not access_token:
        return None
    agora = time.monotonic()
    with _trava:
        achado = _cache_tokens.get(access_token)
        if achado and achado[0] > agora:
            return achado[1]
    user = auth_model.usuario_do_token(access_token)
    if not user:
        return None
    usuario = montar_usuario(user)
    with _trava:
        if len(_cache_tokens) > 1000:
            _cache_tokens.clear()
        _cache_tokens[access_token] = (agora + VALIDADE_CACHE_TOKEN_S, usuario)
    return usuario


def entrar(email: Any, senha: Any) -> SessaoAberta:
    if not isinstance(email, str) or not email.strip() or not isinstance(senha, str) or not senha:
        raise ErroValidacao("Informe 'email' e 'senha'.")
    sessao = auth_model.entrar_com_senha(email.strip(), senha)
    if not sessao:
        raise NaoAutenticado("E-mail ou senha inválidos.")
    return SessaoAberta(montar_usuario(sessao.usuario), sessao.access_token, sessao.refresh_token)


def renovar(refresh_token: str | None) -> SessaoAberta | None:
    if not refresh_token:
        return None
    sessao = auth_model.renovar(refresh_token)
    if not sessao:
        return None
    return SessaoAberta(montar_usuario(sessao.usuario), sessao.access_token, sessao.refresh_token)


def sair(access_token: str | None) -> None:
    if access_token:
        with _trava:
            _cache_tokens.pop(access_token, None)
        auth_model.encerrar(access_token)


def resolver_projeto_id(usuario: UsuarioSessao | None, explicito: str | None = None) -> str:
    """Projeto do usuário (``app_metadata.projeto_id``), senão o informado, senão o padrão do ambiente."""
    if usuario and usuario.projetoId:
        return usuario.projetoId
    if explicito:
        return explicito
    padrao = obter_settings().default_projeto_id
    if not padrao:
        raise ErroConfiguracao("Variável de ambiente DEFAULT_PROJETO_ID ausente.")
    return padrao
