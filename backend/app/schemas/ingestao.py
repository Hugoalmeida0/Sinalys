from typing import Any

from app.schemas.base import Entrada, Saida


class DefinicaoMetrica(Saida):
    id: str | None
    codigo: str | None
    rotulo: str | None
    tipo_valor: str | None
    unidade: str | None = None
    cadencia: str | None = None
    descricao: str | None = None


class DefinicoesSaida(Saida):
    definicoes_metricas: list[DefinicaoMetrica]


class DefinicaoSaida(Saida):
    definicao_metrica: DefinicaoMetrica


class DefinicaoEntrada(Entrada):
    projeto_id: str | None = None
    codigo: Any = None
    rotulo: Any = None
    tipo_valor: Any = None
    unidade: Any = None
    cadencia: Any = None
    descricao: Any = None


class AbaDetectada(Saida):
    aba_origem: str
    colunas: list[str]
    total_linhas: int


class UploadSaida(Saida):
    execucao_ingestao_id: str
    projeto_id: str
    tipo_origem: str
    abas: list[AbaDetectada]


class MapeamentosEntrada(Entrada):
    execucao_ingestao_id: Any = None
    projeto_id: Any = None
    mapeamentos: Any = None


class MapeamentosSaida(Saida):
    mapeamentos: list[dict[str, Any]]


class ProcessarEntrada(Entrada):
    execucao_ingestao_id: Any = None


class Relatorio(Saida):
    linhas_lidas: int
    entidades_criadas: int
    entidades_atualizadas: int
    observacoes_gravadas: int
    eventos_gravados: int
    erros: list[str]


class ProcessarSaida(Saida):
    execucao_ingestao_id: str
    status: str
    relatorio: Relatorio
