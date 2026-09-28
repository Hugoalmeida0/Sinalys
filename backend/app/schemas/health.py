# ruff: noqa: N815
from typing import Any

from app.schemas.base import Entrada, Saida
from app.schemas.painel import ConfigHealthPublico


class HealthPublicoSaida(Saida):
    """O que a página pública mostra: nunca score, faixa, MRR ou sinais em alerta."""

    nome: str
    clienteDesdeTexto: str | None
    destaques: list[str]
    beneficios: list[str]
    linkAgendamento: str | None


class AgendamentoEntrada(Entrada):
    token: Any = None
    nome: Any = None
    email: Any = None
    preferencia_em: Any = None
    mensagem: Any = None
    site: Any = None  # campo-isca contra robôs


class ConfiguracaoEntrada(Entrada):
    cliente_id: Any = None
    entidade_id: Any = None
    projeto_id: str | None = None
    destaques: Any = None
    beneficios: Any = None
    link_agendamento: Any = None


class ConfiguracaoSaida(Saida):
    projeto_id: str
    cliente_id: str
    configuracao: ConfigHealthPublico
