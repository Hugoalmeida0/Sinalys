"""Ferramentas do assistente. Todas são SOMENTE LEITURA: consultam o que o motor já calculou.

Nenhuma ferramenta grava no banco, recalcula score ou gera diagnóstico.
"""

import json
from collections.abc import Callable
from dataclasses import dataclass

from app.errors import SemPredicaoError
from app.models import contatos as contatos_model
from app.models import diagnosticos as diagnosticos_model
from app.models import eventos as eventos_model
from app.services.ia.contexto import montar_contexto_atual, resolver_entidade
from app.services.ia.descricao import descrever_perfil_risco
from app.services.ia.lookalike import buscar_casos_similares
from app.services.motor.faixa import TODAS_FAIXAS
from app.services.painel.clientes import montar_clientes_painel, montar_fila_do_dia
from app.services.painel.kpis import calcular_kpis_painel
from app.utils.numeros import js_round

SEM_MODELO = (
    "O projeto não tem modelo de risco ativo, então não há predições nem fila. Oriente o analista a ativar um "
    "modelo em Configurações."
)


@dataclass
class EscopoFerramentas:
    projeto_id: str
    modelo_id: str | None


def _resumir_cliente(c: dict) -> dict:
    return {
        "id": c["id"],
        "nome": c["nome"],
        "faixa_risco": c["faixaRisco"],
        "score_risco": c["scoreRisco"],
        "tendencia": c["tendenciaScore"],
        "mrr": c["mrr"],
        "score_prioridade": c["scorePrioridade"],
        "sinais": c["sinais"],
        "resumo_alerta": c["resumoAlerta"],
        "silenciado_ate": c["silenciadoAte"],
        "atualizado_em": c["atualizadoEm"],
    }


def _carregar_clientes(escopo: EscopoFerramentas) -> list[dict] | None:
    if not escopo.modelo_id:
        return None
    return montar_clientes_painel(escopo.projeto_id, escopo.modelo_id)["clientes"]


def _inteiro(valor, padrao: int, minimo: int, maximo: int) -> int:
    try:
        n = int(valor)
    except (TypeError, ValueError):
        return padrao
    return min(maximo, max(minimo, n))


def listar_fila_prioridade(escopo: EscopoFerramentas, limite=8, incluir_todas_faixas=False, incluir_silenciados=False):
    clientes = _carregar_clientes(escopo)
    if clientes is None:
        return {"erro": SEM_MODELO}
    fila = montar_fila_do_dia(
        clientes, faixas=TODAS_FAIXAS if incluir_todas_faixas is True else None, incluir_silenciados=incluir_silenciados is True
    )
    return {
        "total_na_fila": len(fila),
        "total_carteira": len(clientes),
        "clientes": [_resumir_cliente(c) for c in fila[: _inteiro(limite, 8, 1, 25)]],
    }


def resumo_carteira(escopo: EscopoFerramentas):
    clientes = _carregar_clientes(escopo)
    if clientes is None or not escopo.modelo_id:
        return {"erro": SEM_MODELO}
    kpis = calcular_kpis_painel(escopo.projeto_id, escopo.modelo_id, clientes)
    por_faixa = {"critico": 0, "alerta": 0, "atencao": 0, "saudavel": 0}
    mrr_total = 0.0
    mrr_em_risco = 0.0
    for c in clientes:
        por_faixa[c["faixaRisco"]] = por_faixa.get(c["faixaRisco"], 0) + 1
        mrr_total += c["mrr"] or 0
        if c["faixaRisco"] in ("critico", "alerta"):
            mrr_em_risco += c["mrr"] or 0
    return {
        "total_clientes": len(clientes),
        "por_faixa": por_faixa,
        "mrr_total": mrr_total,
        "mrr_em_faixas_de_alerta": mrr_em_risco,
        "exposicao_anual_ponderada": kpis["receitaEmRiscoAno"],
        "clientes_contatados_7d": kpis["clientesContatados7d"],
        "antecedencia_media_meses": kpis["antecedenciaMediaMeses"],
        "desfechos_antecipados": kpis["desfechosAntecipados"],
        "silenciados": len([c for c in clientes if c["silenciadoAte"]]),
    }


def detalhar_cliente(escopo: EscopoFerramentas, cliente_id: str = ""):
    entidade = resolver_entidade(escopo.projeto_id, str(cliente_id).strip())
    if not entidade:
        return {"erro": f'Nenhum cliente com código "{cliente_id}" nesta carteira.'}

    clientes = _carregar_clientes(escopo)
    painel = next((c for c in clientes or [] if c["entidadeId"] == entidade["id"]), None)

    try:
        contexto = montar_contexto_atual(escopo.projeto_id, entidade, escopo.modelo_id)
    except SemPredicaoError:
        contexto = None

    diagnostico = diagnosticos_model.buscar_ultimo_da_entidade(
        entidade["id"], "diagnostico_principal, analise_lookalike, plano_acao_imediato, criado_em, modelo_ia"
    )
    contatos = contatos_model.listar_da_entidade(entidade["id"], 5, "tipo, realizado_em, resumo, proximo_passo, autor_nome")
    desfechos = eventos_model.listar_da_entidade(entidade["id"], 5, "codigo_evento, ocorrido_em")

    if painel:
        cliente = {
            **_resumir_cliente(painel),
            "segmento": painel["segmento"],
            "porte": painel["porte"],
            "plano": painel["tipo"],
            "cliente_desde": painel["clienteDesde"],
            "variacao_mrr_pct": painel["variacaoMrr"],
            "cobertura_do_modelo": painel["cobertura"],
        }
    else:
        cliente = {"id": entidade["id_externo"], "nome": entidade.get("nome_exibicao")}

    if contexto:
        def situacao(s) -> str:
            if s.acionado is None:
                return "nao_avaliavel"
            if (s.valor_observado or {}).get("omissao") is True:
                return "acionado_por_omissao_de_dado"
            return "acionado" if s.acionado else "normal"

        predicao = {
            "referencia_em": contexto.referencia_em,
            "score_risco": contexto.pontuacao,
            "faixa_risco": contexto.faixa_risco,
            "cobertura": contexto.cobertura,
            "score_urgencia": contexto.score_urgencia,
            "sinais": [
                {
                    "metrica": s.metrica,
                    "situacao": situacao(s),
                    "valor_observado": (s.valor_observado or {}).get("valor", (s.valor_observado or {}).get("ultimo_valor")),
                    "unidade": s.unidade,
                    "peso": s.peso,
                    "pontos": s.pontos,
                }
                for s in contexto.sinais
            ],
        }
    else:
        predicao = {
            "aviso": "Este cliente ainda não tem predição do motor de risco. Oriente a rodar o cálculo de risco "
            "antes de analisar sinais."
        }

    return {
        "cliente": cliente,
        "predicao": predicao,
        "ultimo_diagnostico_ia": diagnostico,
        "ultimos_contatos": contatos,
        "desfechos_passados": desfechos,
    }


def buscar_casos_similares_cliente(escopo: EscopoFerramentas, cliente_id: str = "", limite=3):
    entidade = resolver_entidade(escopo.projeto_id, str(cliente_id).strip())
    if not entidade:
        return {"erro": f'Nenhum cliente com código "{cliente_id}" nesta carteira.'}
    try:
        contexto = montar_contexto_atual(escopo.projeto_id, entidade, escopo.modelo_id)
    except SemPredicaoError as erro:
        return {"erro": erro.mensagem}

    casos = buscar_casos_similares(
        escopo.projeto_id, descrever_perfil_risco(contexto), entidade_excluida=entidade["id"], limite=_inteiro(limite, 3, 1, 5)
    )
    resposta = {
        "total": len(casos),
        "casos": [
            {
                "cliente": c.nome_exibicao,
                "similaridade_pct": js_round(c.similaridade * 100),
                "perfil_na_epoca": c.contexto_texto,
                "acao_realizada": c.acao_realizada,
                "desfecho": c.desfecho,
            }
            for c in casos
        ],
    }
    if not casos:
        resposta["aviso"] = "Nenhum caso histórico similar na base. Diga isso ao analista; não invente comparações."
    return resposta


@dataclass
class Ferramenta:
    nome: str
    descricao: str
    parametros: dict
    executar: Callable[..., dict]

    def definicao(self) -> dict:
        return {
            "type": "function",
            "function": {"name": self.nome, "description": self.descricao, "parameters": self.parametros},
        }


FERRAMENTAS: dict[str, Ferramenta] = {
    f.nome: f
    for f in [
        Ferramenta(
            "listar_fila_prioridade",
            "Lista os clientes que merecem atenção agora, ordenados por prioridade (risco × impacto financeiro). "
            "Por padrão traz só as faixas crítico e alerta, sem os silenciados. Use para 'quem está em risco', "
            "'por onde começo', 'quem merece atenção'.",
            {
                "type": "object",
                "properties": {
                    "limite": {"type": "integer", "minimum": 1, "maximum": 25, "default": 8, "description": "Quantos clientes devolver."},
                    "incluir_todas_faixas": {"type": "boolean", "default": False, "description": "true para incluir também 'atencao' e 'saudavel'."},
                    "incluir_silenciados": {"type": "boolean", "default": False},
                },
            },
            listar_fila_prioridade,
        ),
        Ferramenta(
            "resumo_carteira",
            "Visão geral da carteira: quantidade de clientes por faixa de risco, exposição anual ponderada, "
            "clientes contatados nos últimos 7 dias e antecedência média com que o motor sinalizou desfechos "
            "passados. Use para 'resuma minha carteira', 'como está o mês'.",
            {"type": "object", "properties": {}},
            resumo_carteira,
        ),
        Ferramenta(
            "detalhar_cliente",
            "Raio-x completo de UM cliente: score e faixa de risco, cada sinal avaliado pelo motor com valor "
            "observado e peso, receita mensal, último diagnóstico de IA (se existir), últimos contatos registrados "
            "pelo time e desfechos passados. Use sempre que a pergunta for sobre um cliente específico ('por que o "
            "C004 está crítico', 'como agir com este cliente').",
            {
                "type": "object",
                "properties": {
                    "cliente_id": {
                        "type": "string",
                        "minLength": 1,
                        "description": "Código do cliente como aparece no painel (ex: 'C004') ou UUID.",
                    }
                },
                "required": ["cliente_id"],
            },
            detalhar_cliente,
        ),
        Ferramenta(
            "buscar_casos_similares",
            "Busca no histórico da própria empresa os clientes que se comportaram de forma parecida com este (busca "
            "semântica), com a ação que o time tomou e o desfecho (recuperado/cancelado). Use para 'o que funcionou "
            "em casos assim', 'o que o histórico diz'.",
            {
                "type": "object",
                "properties": {
                    "cliente_id": {"type": "string", "minLength": 1, "description": "Código do cliente (ex: 'C004') ou UUID."},
                    "limite": {"type": "integer", "minimum": 1, "maximum": 5, "default": 3},
                },
                "required": ["cliente_id"],
            },
            buscar_casos_similares_cliente,
        ),
    ]
}


def executar_ferramenta(nome: str, argumentos_json: str, escopo: EscopoFerramentas) -> dict:
    ferramenta = FERRAMENTAS.get(nome)
    if not ferramenta:
        return {"erro": f"Ferramenta desconhecida: {nome}."}
    try:
        argumentos = json.loads(argumentos_json or "{}") or {}
    except json.JSONDecodeError:
        return {"erro": "Argumentos inválidos para a ferramenta."}
    permitidos = set(ferramenta.parametros.get("properties", {}))
    return ferramenta.executar(escopo, **{k: v for k, v in argumentos.items() if k in permitidos})
