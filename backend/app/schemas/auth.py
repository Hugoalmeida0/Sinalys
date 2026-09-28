from typing import Any

from app.schemas.base import Entrada, Saida


class LoginEntrada(Entrada):
    email: Any = None
    senha: Any = None


class Usuario(Saida):
    id: str
    email: str
    nome: str
    cargo: str | None
    iniciais: str
    projetoId: str | None  # noqa: N815


class UsuarioSaida(Saida):
    usuario: Usuario


class Ok(Saida):
    ok: bool = True
