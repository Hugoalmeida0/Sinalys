from typing import Any

from app.schemas.base import Entrada, Saida


class CalcularEntrada(Entrada):
    projeto_id: str | None = None
    modelo_id: str | None = None
    referencia_em: Any = None


class MotivoCalculado(Saida):
    regra_modelo_id: str
    peso: float
    acionado: bool | None
    valor_observado: dict[str, Any] | None
    valor_normalizado: float | None
    pontos: float


class PredicaoCalculada(Saida):
    entidade_id: str
    pontuacao: float
    faixa_risco: str
    cobertura: float
    valor_impacto: float | None
    motivos: list[MotivoCalculado]


class CalculoSaida(Saida):
    projeto_id: str
    modelo_id: str
    referencia_em: str
    total_entidades: int
    predicoes: list[PredicaoCalculada]
    avisos: list[str]


class RegraModelo(Saida):
    id: str
    codigo_sinal: str
    metrica_id: str
    metrica_codigo: str
    metrica_rotulo: str
    metrica_unidade: str | None
    tipo: str
    direcao: str
    janela_dias: float | None
    janela_observacoes: float | None
    pontuacao_omissao: float | None
    peso: float


class MetricaDisponivel(Saida):
    id: str
    codigo: str
    rotulo: str
    unidade: str | None


class Recalculo(Saida):
    total_entidades: int
    avisos: list[str]


class ModeloSaida(Saida):
    modelo_id: str
    versao: int
    regras: list[RegraModelo]
    metricas_disponiveis: list[MetricaDisponivel]
    recalculo: Recalculo | None = None


class AtualizarPesosEntrada(Entrada):
    projeto_id: str | None = None
    atualizacoes: Any = None


class NovaRegraEntrada(Entrada):
    projeto_id: str | None = None
    metrica_id: Any = None
    tipo: Any = None
    direcao: Any = None
    peso: Any = None
    janela_dias: Any = None
    janela_observacoes: Any = None
    pontuacao_omissao: Any = None
