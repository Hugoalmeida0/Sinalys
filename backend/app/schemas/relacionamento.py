from typing import Any

from app.schemas.base import Entrada, Saida


class ContatoEntrada(Entrada):
    cliente_id: Any = None
    entidade_id: Any = None
    projeto_id: str | None = None
    tipo: Any = None
    realizado_em: Any = None
    data: Any = None
    resumo: Any = None
    proximo_passo: Any = None
    proximo_passo_em: Any = None


class Contato(Saida):
    id: str | None
    tipo: str | None
    realizado_em: str | None
    resumo: str | None
    proximo_passo: str | None
    proximo_passo_em: str | None
    autor_nome: str | None
    criado_em: str | None


class ContatoSaida(Saida):
    projeto_id: str
    cliente_id: str
    contato: Contato


class ContatoListado(Contato):
    entidade_id: str | None
    entidades: dict[str, Any] | None = None


class ContatosSaida(Saida):
    projeto_id: str
    contatos: list[ContatoListado]


class SilenciarEntrada(Entrada):
    cliente_id: Any = None
    entidade_id: Any = None
    projeto_id: str | None = None
    dias: Any = None
    motivo: Any = None


class Silenciamento(Saida):
    id: str | None
    silenciado_ate: str | None
    motivo: str | None
    criado_em: str | None


class SilenciarSaida(Saida):
    projeto_id: str
    cliente_id: str
    silenciamento: Silenciamento


class ReativarSaida(Saida):
    projeto_id: str
    cliente_id: str
    encerrados: int


class CancelarEntrada(Entrada):
    cliente_id: Any = None
    entidade_id: Any = None
    projeto_id: str | None = None
    motivo_categoria: Any = None
    motivo_detalhe: Any = None
    acao_realizada: Any = None


class CancelarSaida(Saida):
    projeto_id: str
    evento_desfecho_id: str
    indexado_no_historico: bool
