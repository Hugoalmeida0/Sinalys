# ruff: noqa: N815 - campos em camelCase fazem parte do contrato consumido pelo frontend
from typing import Any

from app.schemas.base import Saida


class MotivoCancelamento(Saida):
    categoria: str
    detalhe: str | None = None


class ConfigHealthPublico(Saida):
    destaques: list[str] | None = None
    beneficios: list[str] | None = None
    linkAgendamento: str | None = None
    atualizadoEm: str | None = None


class ClientePainel(Saida):
    id: str
    entidadeId: str
    nome: str
    segmento: str
    porte: str
    tipo: str
    mrr: float | None
    receitaAnualRisco: float | None  # exposição ponderada anual (MRR × 12 × score/100)
    scoreRisco: int
    scoreMax: int = 100
    faixaRisco: str
    tendenciaScore: str
    clienteDesde: str
    resumoAlerta: str
    variacaoMrr: int | None
    sinais: list[str]
    atualizadoEm: str
    cobertura: float | None
    scorePrioridade: float
    impactoRelativo: float
    silenciadoAte: str | None
    cancelado: bool
    canceladoEm: str | None
    teste: bool
    testeOrigem: str | None
    motivoCancelamento: MotivoCancelamento | None
    tokenCompartilhamento: str
    healthPublico: ConfigHealthPublico


class ResumoFaixa(Saida):
    faixa: str
    total: int
    percentual: int


class CarteiraSaida(Saida):
    projeto_id: str
    modelo_id: str
    sem_predicao: int
    resumo_carteira: list[ResumoFaixa]
    clientes: list[ClientePainel]


class FilaSaida(Saida):
    projeto_id: str
    modelo_id: str
    segmentos: list[str]
    total_carteira: int
    sem_predicao: int
    fila: list[ClientePainel]


class KpisPainel(Saida):
    receitaEmRiscoAno: float  # exposição ponderada anual das contas em alerta
    clientesEmAlerta: int
    totalCarteira: int
    antecedenciaMediaMeses: float | None
    antecedenciaMedianaMeses: float | None
    antecedenciaMaximaMeses: float | None
    desfechosAntecipados: int
    clientesContatados7d: int
    receitaSalva30d: float
    clientesRecuperados30d: int


class KpisSaida(Saida):
    projeto_id: str | None = None
    modelo_id: str | None
    kpis: KpisPainel


class InicioSaida(Saida):
    modelo_id: str | None
    total_clientes: int
    fila: list[ClientePainel]


class Evidencia(Saida):
    id: str
    severidade: str
    titulo: str


class ProximaAcao(Saida):
    id: str
    titulo: str
    concluida: bool


class EventoHistorico(Saida):
    id: str
    data: str
    tipo: str
    titulo: str
    descricao: str
    autor: str | None = None


class PontoScore(Saida):
    mes: str
    score: int


class SinalSimulavel(Saida):
    codigo: str
    metrica: str
    peso: float
    pontos: float
    descricao: str


class BaseSimulacao(Saida):
    scoreRisco: float
    somaPesos: float
    mrr: float | None
    impactoRelativo: float
    sinais: list[SinalSimulavel]


class Destaque(Saida):
    codigo: str
    rotulo: str


class DetalheCliente(ClientePainel):
    nomeFantasia: str
    responsavelCS: str
    evidencias: list[Evidencia]
    proximasAcoes: list[ProximaAcao]
    avaliacaoIA: str
    analiseLookalike: str | None
    diagnosticoGeradoEm: str | None
    historico: list[EventoHistorico]
    evolucaoScore: list[PontoScore]
    resumoCliente: str
    explicacaoRisco: str
    destaquesDisponiveis: list[Destaque]
    simulacao: BaseSimulacao


class PredicaoFila(Saida):
    id: str
    entidade_id: str
    pontuacao: float
    faixa_risco: str | None
    cobertura: Any = None
    valor_impacto: float | None
    referencia_em: str
    score_urgencia: float | None


class FilaUrgenciaSaida(Saida):
    projeto_id: str
    modelo_id: str
    fila: list[PredicaoFila]
