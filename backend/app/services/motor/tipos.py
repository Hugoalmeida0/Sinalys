from dataclasses import dataclass, field
from typing import Any


@dataclass
class ConfigRegra:
    tipo: str  # "zscore_carteira" | "media_movel"
    direcao: str  # "maior_pior" | "menor_pior"
    pontuacao_omissao: float | None = None
    clip_z: float | None = None
    janela_observacoes: int | None = None  # só zscore_carteira
    janela_dias: float | None = None  # só media_movel


@dataclass
class RegraModelo:
    id: str
    metrica_id: str
    codigo_sinal: str
    config_regra: ConfigRegra
    peso: float


@dataclass
class ObservacaoNumerica:
    entidade_id: str
    observado_em: str
    valor_numero: float


@dataclass
class ResultadoRegra:
    """Contribuição de uma regra para o score de uma entidade (vira ``motivos_predicao``)."""

    regra_modelo_id: str
    peso: float
    acionado: bool | None
    valor_observado: dict[str, Any] | None
    valor_normalizado: float | None
    pontos: float


@dataclass
class ResultadoPredicao:
    entidade_id: str
    pontuacao: float
    faixa_risco: str
    cobertura: float
    valor_impacto: float | None
    motivos: list[ResultadoRegra] = field(default_factory=list)
