"""Supabase Auth: login por e-mail e senha, validação e renovação de sessão."""

from dataclasses import dataclass
from typing import Any

from app.database import cliente_admin, cliente_publico


@dataclass
class SessaoSupabase:
    access_token: str
    refresh_token: str
    usuario: Any


def entrar_com_senha(email: str, senha: str) -> SessaoSupabase | None:
    try:
        resposta = cliente_publico().auth.sign_in_with_password({"email": email, "password": senha})
    except Exception:  # noqa: BLE001 - credencial inválida chega como exceção do SDK
        return None
    if not resposta.session or not resposta.user:
        return None
    return SessaoSupabase(resposta.session.access_token, resposta.session.refresh_token, resposta.user)


def renovar(refresh_token: str) -> SessaoSupabase | None:
    try:
        resposta = cliente_publico().auth.refresh_session(refresh_token)
    except Exception:  # noqa: BLE001
        return None
    if not resposta.session or not resposta.user:
        return None
    return SessaoSupabase(resposta.session.access_token, resposta.session.refresh_token, resposta.user)


def usuario_do_token(access_token: str) -> Any | None:
    """Valida o JWT no Supabase (``getUser``): rejeita sessão revogada, não só assinatura inválida."""
    try:
        resposta = cliente_admin().auth.get_user(access_token)
    except Exception:  # noqa: BLE001
        return None
    return resposta.user if resposta else None


def encerrar(access_token: str) -> None:
    try:
        cliente_admin().auth.admin.sign_out(access_token)
    except Exception:  # noqa: BLE001 - sessão já expirada também conta como encerrada
        pass
