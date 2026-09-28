from fastapi import Request, Response

from app.controllers.sessao import COOKIE_ACESSO, apagar_cookies, gravar_cookies
from app.schemas.auth import LoginEntrada
from app.services import sessao as sessao_service
from app.services.sessao import UsuarioSessao


def entrar(corpo: LoginEntrada, response: Response) -> dict:
    sessao = sessao_service.entrar(corpo.email, corpo.senha)
    gravar_cookies(response, sessao)
    return {"usuario": sessao.usuario.para_dict()}


def sair(request: Request, response: Response) -> dict:
    sessao_service.sair(request.cookies.get(COOKIE_ACESSO))
    apagar_cookies(response)
    return {"ok": True}


def eu(usuario: UsuarioSessao) -> dict:
    return {"usuario": usuario.para_dict()}
