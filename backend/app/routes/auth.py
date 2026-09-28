from fastapi import APIRouter, Depends, Request, Response

from app.controllers import auth_controller
from app.controllers.sessao import usuario_obrigatorio
from app.schemas.auth import LoginEntrada, Ok, UsuarioSaida
from app.services.sessao import UsuarioSessao

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=UsuarioSaida)
def login(corpo: LoginEntrada, response: Response):
    return auth_controller.entrar(corpo, response)


@router.post("/logout", response_model=Ok)
def logout(request: Request, response: Response):
    return auth_controller.sair(request, response)


@router.get("/me", response_model=UsuarioSaida)
def me(usuario: UsuarioSessao = Depends(usuario_obrigatorio)):
    return auth_controller.eu(usuario)
