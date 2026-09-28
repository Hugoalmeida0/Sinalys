"""Contexto factual de uma entidade: a última predição e seus motivos (as evidências do score)."""

from dataclasses import asdict, dataclass, field
from typing import Any

from app.database import em_paralelo
from app.errors import SemPredicaoError
from app.models import entidades as entidades_model
from app.models import motivos as motivos_model
from app.models import predicoes as predicoes_model
from app.models import projetos as projetos_model
from app.services.motor.urgencia import calcular_score_urgencia
from app.services.painel.clientes import relacao


@dataclass
class SinalRisco:
    codigo_sinal: str
    metrica: str
    unidade: str | None
    acionado: bool | None
    valor_observado: dict[str, Any] | None
    peso: float
    pontos: float


@dataclass
class ContextoAtual:
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
    sinais: list[SinalRisco] = field(default_factory=list)

    def para_dict(self) -> dict:
        return asdict(self)


def resolver_entidade(projeto_id: str, identificador: str) -> dict | None:
    return entidades_model.resolver(projeto_id, identificador)


def montar_contexto_atual(projeto_id: str, entidade: dict, modelo_id: str | None = None) -> ContextoAtual:
    predicao = predicoes_model.ultima_da_entidade(projeto_id, entidade["id"], modelo_id)
    if not predicao:
        raise SemPredicaoError(
            f'Entidade "{entidade["id_externo"]}" não possui predição calculada. '
            "Rode POST /api/motor/calcular antes de solicitar o diagnóstico."
        )

    projeto, motivos = em_paralelo(
        lambda: projetos_model.buscar_info(projeto_id),
        lambda: motivos_model.listar_da_predicao(predicao["id"]),
    )

    sinais = []
    for m in motivos:
        regra = relacao(m.get("regras_modelo")) or {}
        metrica = relacao(regra.get("definicoes_metricas")) or {}
        sinais.append(
            SinalRisco(
                codigo_sinal=regra.get("codigo_sinal") or "desconhecido",
                metrica=metrica.get("rotulo") or "Métrica desconhecida",
                unidade=metrica.get("unidade"),
                acionado=m.get("acionado"),
                valor_observado=m.get("valor_observado"),
                peso=float(regra.get("peso") or 0),
                pontos=float(m.get("pontos") or 0),
            )
        )
    sinais.sort(key=lambda s: -s.pontos)

    pontuacao = float(predicao["pontuacao"])
    valor_impacto = None if predicao.get("valor_impacto") is None else float(predicao["valor_impacto"])

    return ContextoAtual(
        entidade_id=entidade["id"],
        id_externo=entidade["id_externo"],
        nome_exibicao=entidade.get("nome_exibicao"),
        rotulo_entidade=(projeto or {}).get("rotulo_entidade") or "Entidade",
        predicao_id=predicao["id"],
        referencia_em=predicao["referencia_em"],
        pontuacao=pontuacao,
        faixa_risco=predicao.get("faixa_risco"),
        cobertura=None if predicao.get("cobertura") is None else float(predicao["cobertura"]),
        valor_impacto=valor_impacto,
        score_urgencia=calcular_score_urgencia(pontuacao, valor_impacto),
        sinais=sinais,
    )
