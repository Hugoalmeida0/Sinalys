"""Orquestração do diagnóstico por IA de uma entidade.

1. lê a última predição e seus motivos (fatos do motor — nada é recalculado);
2. reaproveita o diagnóstico já gerado para essa mesma predição, se houver;
3. busca casos históricos semelhantes (embedding Gemini + pgvector);
4. pede à LLM diagnóstico e plano no formato do ``Diagnostico``;
5. se a LLM falhar, cai no fallback por regras;
6. o backend grava o resultado em ``diagnosticos_ia`` (cache/auditoria).
"""

import logging
import re
import uuid
from dataclasses import dataclass, field

from pydantic import ValidationError

from app.config import obter_settings
from app.errors import EntidadeNaoEncontradaError, ErroApi, ErroValidacao
from app.models import diagnosticos as diagnosticos_model
from app.services.ia.contexto import ContextoAtual, montar_contexto_atual, resolver_entidade
from app.services.ia.descricao import descrever_perfil_risco
from app.services.ia.embeddings import obter_modelo_embedding
from app.services.ia.esquema import Diagnostico, json_schema_diagnostico
from app.services.ia.fallback import MODELO_IA_FALLBACK, gerar_diagnostico_fallback
from app.services.ia.lookalike import CasoSimilar, buscar_casos_similares
from app.services.ia.openrouter import gerar_objeto
from app.services.ia.prompt import PROMPT_SISTEMA, montar_prompt_usuario

log = logging.getLogger("sinalys.ia")

PREFIXO_ENUMERACAO = re.compile(r"^\s*(?:\d{1,2}\s*[.)\-–:]|[-*•])\s*")


@dataclass
class ResultadoAnalise:
    diagnostico_id: str
    contexto: ContextoAtual
    diagnostico: Diagnostico
    modelo_ia: str
    modelo_embedding: str
    origem: str  # "ia" | "cache" | "fallback"
    casos_similares: list[CasoSimilar] = field(default_factory=list)


def normalizar_diagnostico(diagnostico: Diagnostico) -> Diagnostico:
    """Tira a numeração que alguns modelos embutem nos itens ("1. Ligar...")."""
    plano = [PREFIXO_ENUMERACAO.sub("", item, count=1).strip() for item in diagnostico.plano_acao_imediato]
    plano = [item for item in plano if item]
    return diagnostico.model_copy(update={"plano_acao_imediato": plano or diagnostico.plano_acao_imediato})


def _diagnostico_em_cache(projeto_id: str, contexto: ContextoAtual) -> ResultadoAnalise | None:
    linha = diagnosticos_model.buscar_da_predicao(projeto_id, contexto.predicao_id)
    if not linha:
        return None

    casos = [
        CasoSimilar(
            id=str(c.get("caso_id") or ""),
            entidade_id=str(c.get("entidade_id") or ""),
            nome_exibicao=None,
            contexto_texto="",
            acao_realizada="",
            desfecho="recuperado" if c.get("desfecho") == "recuperado" else "cancelado",
            similaridade=float(c.get("similaridade") or 0),
            criado_em="",
        )
        for c in (linha.get("casos_similares") if isinstance(linha.get("casos_similares"), list) else [])
    ]
    plano = linha.get("plano_acao_imediato") if isinstance(linha.get("plano_acao_imediato"), list) else []
    return ResultadoAnalise(
        diagnostico_id=linha["id"],
        contexto=contexto,
        casos_similares=casos,
        diagnostico=Diagnostico.model_construct(
            diagnostico_principal=linha["diagnostico_principal"],
            analise_lookalike=linha["analise_lookalike"],
            plano_acao_imediato=plano,
        ),
        modelo_ia=linha["modelo_ia"],
        modelo_embedding=linha["modelo_embedding"],
        origem="cache",
    )


def _gerar_com_llm(contexto: ContextoAtual, casos: list[CasoSimilar]) -> tuple[Diagnostico, str, str]:
    """Tenta a LLM; qualquer falha (rede, cota, JSON fora do contrato) vira fallback por regras."""
    modelo_llm = obter_settings().openrouter_modelo_llm
    try:
        bruto = gerar_objeto(
            modelo_llm,
            PROMPT_SISTEMA,
            montar_prompt_usuario(contexto, casos),
            "DiagnosticoChurn",
            json_schema_diagnostico(),
        )
        return normalizar_diagnostico(Diagnostico.model_validate(bruto)), "ia", modelo_llm
    except (Exception, ValidationError) as erro:  # noqa: BLE001
        log.error("[ia/analisar] LLM falhou, usando fallback por regras: %s", erro)
        return gerar_diagnostico_fallback(contexto, casos), "fallback", MODELO_IA_FALLBACK


def analisar_risco_entidade(
    projeto_id: str,
    identificador_entidade: str,
    modelo_id: str | None = None,
    origem_gatilho: str = "manual",
    persistir: bool = True,
    forcar: bool = False,
) -> ResultadoAnalise:
    entidade = resolver_entidade(projeto_id, identificador_entidade)
    if not entidade:
        raise EntidadeNaoEncontradaError(
            f'Nenhuma entidade com identificador "{identificador_entidade}" no projeto {projeto_id}.'
        )

    contexto = montar_contexto_atual(projeto_id, entidade, modelo_id)

    if not forcar:
        em_cache = _diagnostico_em_cache(projeto_id, contexto)
        if em_cache:
            return em_cache

    casos = buscar_casos_similares(projeto_id, descrever_perfil_risco(contexto), entidade_excluida=entidade["id"])
    diagnostico, origem, modelo_usado = _gerar_com_llm(contexto, casos)
    modelo_embedding = obter_modelo_embedding()

    diagnostico_id = str(uuid.uuid4())
    if persistir:
        diagnosticos_model.inserir(
            {
                "id": diagnostico_id,
                "projeto_id": projeto_id,
                "entidade_id": contexto.entidade_id,
                "predicao_id": contexto.predicao_id,
                "diagnostico_principal": diagnostico.diagnostico_principal,
                "analise_lookalike": diagnostico.analise_lookalike,
                "plano_acao_imediato": diagnostico.plano_acao_imediato,
                "casos_similares": [
                    {"caso_id": c.id, "entidade_id": c.entidade_id, "similaridade": c.similaridade, "desfecho": c.desfecho}
                    for c in casos
                ],
                "modelo_ia": modelo_usado,
                "modelo_embedding": modelo_embedding,
                "origem_gatilho": origem_gatilho,
            }
        )

    return ResultadoAnalise(
        diagnostico_id=diagnostico_id,
        contexto=contexto,
        casos_similares=casos,
        diagnostico=diagnostico,
        modelo_ia=modelo_usado,
        modelo_embedding=modelo_embedding,
        origem=origem,
    )


def executar_analise(projeto_id: str, dados: dict) -> dict:
    """Caso de uso de ``POST /api/inteligencia/analisar``."""
    identificador = dados.get("cliente_id") or dados.get("entidade_id")
    if not isinstance(identificador, str) or not identificador:
        raise ErroValidacao("Campo 'cliente_id' é obrigatório (UUID da entidade ou id_externo).")

    try:
        resultado = analisar_risco_entidade(
            projeto_id,
            identificador,
            modelo_id=dados.get("modelo_id"),
            origem_gatilho="cron" if dados.get("trigger_source") == "cron" else "manual",
            persistir=dados.get("persistir") is not False,
            forcar=dados.get("forcar") is True,
        )
    except ErroApi:
        raise
    except Exception as erro:  # noqa: BLE001
        raise ErroApi(f"Falha ao gerar diagnóstico: {erro}") from erro

    return {
        "projeto_id": projeto_id,
        "diagnostico_id": resultado.diagnostico_id,
        "modelo_ia": resultado.modelo_ia,
        "modelo_embedding": resultado.modelo_embedding,
        "contexto": resultado.contexto.para_dict(),
        "casos_similares": [c.para_dict() for c in resultado.casos_similares],
        "origem": resultado.origem,
        **resultado.diagnostico.model_dump(),
    }
