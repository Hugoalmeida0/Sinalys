from typing import Any

from app.schemas.base import Entrada, Saida


class AnalisarEntrada(Entrada):
    cliente_id: Any = None
    entidade_id: Any = None
    projeto_id: str | None = None
    modelo_id: str | None = None
    trigger_source: Any = None
    persistir: Any = None
    forcar: Any = None


class SinalContexto(Saida):
    codigo_sinal: str
    metrica: str
    unidade: str | None
    acionado: bool | None
    valor_observado: dict[str, Any] | None
    peso: float
    pontos: float


class ContextoAnalise(Saida):
    """Os fatos do motor que alimentaram a análise — a LLM não os altera."""

    entidade_id: str
    id_externo: str
    nome_exibicao: str | None
    rotulo_entidade: str
    predicao_id: str
    referencia_em: str
    pontuacao: float
    faixa_risco: str | None
    cobertura: float | None
    valor_impacto: float | None
    score_urgencia: float | None
    sinais: list[SinalContexto]


class CasoSimilarSaida(Saida):
    id: str
    entidade_id: str
    nome_exibicao: str | None
    contexto_texto: str
    acao_realizada: str
    desfecho: str
    similaridade: float
    criado_em: str


class AnaliseSaida(Saida):
    projeto_id: str
    diagnostico_id: str
    modelo_ia: str
    modelo_embedding: str
    contexto: ContextoAnalise
    casos_similares: list[CasoSimilarSaida]
    origem: str  # "ia" | "cache" | "fallback"
    diagnostico_principal: str
    analise_lookalike: str
    plano_acao_imediato: list[str]


class FeedbackEntrada(Entrada):
    cliente_id: Any = None
    entidade_id: Any = None
    projeto_id: str | None = None
    acao_realizada: Any = None
    desfecho: Any = None
    evento_desfecho_id: Any = None
    contexto_texto: Any = None
    modelo_id: Any = None


class FeedbackSaida(Saida):
    projeto_id: str
    caso_id: str
    entidade_id: str
    contexto_texto: str
    desfecho: str
    modelo_embedding: str


class MensagemChat(Entrada):
    role: str
    content: str = ""


class TelaChat(Entrada):
    caminho: str | None = None
    clienteId: str | None = None  # noqa: N815


class ChatEntrada(Entrada):
    messages: list[MensagemChat] | None = None
    tela: TelaChat | None = None
