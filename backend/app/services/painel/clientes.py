"""Visão de carteira: um ``ClientePainel`` por entidade com predição."""

from datetime import datetime, timezone
from functools import cmp_to_key

from app.database import em_paralelo
from app.models import entidades as entidades_model
from app.models import eventos as eventos_model
from app.models import metricas as metricas_model
from app.models import motivos as motivos_model
from app.models import observacoes as observacoes_model
from app.models import predicoes as predicoes_model
from app.models import projetos as projetos_model
from app.models import silenciamentos as silenciamentos_model
from app.services.health_config import ler_config_health_publico
from app.services.motor.constantes import CODIGO_METRICA_RECEITA_MENSAL
from app.services.motor.faixa import FAIXAS_FILA_PADRAO, TODAS_FAIXAS
from app.services.motor.urgencia import calcular_faixa_receita, calcular_impacto_relativo, calcular_score_prioridade
from app.utils.formatacao import formatar_moeda_brl, formatar_numero_ptbr, iso_js
from app.utils.numeros import js_round, numero

MAX_SINAIS = 3
LIMIAR_TENDENCIA = 3
RESUMO_SEM_SINAIS = "Todos os indicadores dentro do esperado"
TAMANHO_RESUMO_FILA = 5


def relacao(valor):
    """O PostgREST devolve relação embutida como objeto ou lista, conforme a cardinalidade."""
    if valor is None:
        return None
    if isinstance(valor, list):
        return valor[0] if valor else None
    return valor


def _atributo_texto(atributos, chave: str) -> str:
    if not isinstance(atributos, dict):
        return ""
    v = atributos.get(chave)
    if isinstance(v, str):
        return v
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return str(v) if not float(v).is_integer() else str(int(v))
    return ""


def _atributo_booleano(atributos, chave: str) -> bool:
    return isinstance(atributos, dict) and atributos.get(chave) is True


def formatar_valor_sinal(valor: float, unidade: str | None) -> str:
    u = (unidade or "").lower()
    n = formatar_numero_ptbr(valor, max_casas=1)
    if u in ("percentual", "%"):
        return f"{n}%"
    if u == "dias":
        return f"{n} dias"
    if u in ("horas", "h"):
        return f"{n}h"
    if u == "brl":
        return formatar_moeda_brl(valor)
    return n


def _valor_do_observado(obs: dict) -> float | None:
    bruto = obs.get("valor")
    if bruto is None:
        bruto = obs.get("ultimo_valor")
    return numero(bruto)


def descrever_sinal(motivo: dict) -> str:
    """Texto curto de um sinal acionado: "Uso da plataforma ↓ 42%"."""
    regra = relacao(motivo.get("regras_modelo")) or {}
    metrica = relacao(regra.get("definicoes_metricas")) or {}
    rotulo = metrica.get("rotulo") or regra.get("codigo_sinal") or "Sinal"
    obs = motivo.get("valor_observado") or {}

    if obs.get("omissao") is True:
        return f"{rotulo}: sem dados"

    valor = _valor_do_observado(obs)
    if valor is None:
        return rotulo

    direcao = (regra.get("config_regra") or {}).get("direcao")
    seta = "↓" if direcao == "menor_pior" else "↑" if direcao == "maior_pior" else ""
    return " ".join(p for p in (rotulo, seta, formatar_valor_sinal(valor, metrica.get("unidade"))) if p)


def tendencia(atual: float, anterior: float | None) -> str:
    if anterior is None:
        return "estavel"
    delta = atual - anterior
    if delta >= LIMIAR_TENDENCIA:
        return "subindo"
    if delta <= -LIMIAR_TENDENCIA:
        return "descendo"
    return "estavel"


def montar_clientes_painel(projeto_id: str, modelo_id: str, agora: datetime | None = None) -> dict:
    agora = agora or datetime.now(timezone.utc)
    agora_iso = iso_js(agora)

    entidades, predicoes, projeto, eventos, metrica_receita_id = em_paralelo(
        lambda: entidades_model.listar_para_painel(projeto_id),
        lambda: predicoes_model.listar_do_modelo(projeto_id, modelo_id),
        lambda: projetos_model.buscar_info(projeto_id),
        lambda: eventos_model.listar_do_projeto(projeto_id),
        lambda: metricas_model.id_por_codigo_cache(projeto_id, CODIGO_METRICA_RECEITA_MENSAL),
    )

    # Último evento-alvo (cancelamento) de cada entidade, com o motivo se houver.
    cancelado_em: dict[str, str] = {}
    motivo_por_entidade: dict[str, dict] = {}
    if projeto and projeto.get("codigo_evento_alvo"):
        for evento in eventos:
            if evento["codigo_evento"] != projeto["codigo_evento_alvo"]:
                continue
            atual = cancelado_em.get(evento["entidade_id"])
            if not atual or evento["ocorrido_em"] > atual:
                cancelado_em[evento["entidade_id"]] = evento["ocorrido_em"]
                if evento.get("motivo_categoria"):
                    motivo_por_entidade[evento["entidade_id"]] = {
                        "categoria": evento["motivo_categoria"],
                        "detalhe": evento.get("motivo_detalhe"),
                    }
                else:
                    motivo_por_entidade.pop(evento["entidade_id"], None)

    ultima: dict[str, dict] = {}
    anterior: dict[str, dict] = {}
    for p in predicoes:
        if p["entidade_id"] not in ultima:
            ultima[p["entidade_id"]] = p
        elif p["entidade_id"] not in anterior:
            anterior[p["entidade_id"]] = p

    predicao_ids = [p["id"] for p in ultima.values()]
    entidade_ids = list(ultima.keys())

    motivos, silenciamentos, receitas = em_paralelo(
        lambda: motivos_model.listar_acionados(predicao_ids) if predicao_ids else [],
        lambda: silenciamentos_model.listar_vigentes(projeto_id, entidade_ids, agora_iso) if entidade_ids else [],
        lambda: (
            observacoes_model.listar_receita(projeto_id, metrica_receita_id, entidade_ids, agora_iso)
            if metrica_receita_id and entidade_ids
            else []
        ),
    )

    motivos_por_predicao: dict[str, list[dict]] = {}
    for m in motivos:
        motivos_por_predicao.setdefault(m["predicao_id"], []).append(m)

    receita_historico: dict[str, list[float]] = {}
    for o in receitas:
        lista = receita_historico.setdefault(o["entidade_id"], [])
        if len(lista) < 2:
            lista.append(float(o["valor_numero"]))

    silenciado_ate: dict[str, str] = {}
    for s in silenciamentos:
        atual = silenciado_ate.get(s["entidade_id"])
        if not atual or s["silenciado_ate"] > atual:
            silenciado_ate[s["entidade_id"]] = s["silenciado_ate"]

    faixa_receita = calcular_faixa_receita(
        [numero((ultima.get(e["id"]) or {}).get("valor_impacto")) for e in entidades if e["id"] not in cancelado_em]
    )

    clientes: list[dict] = []
    sem_predicao = 0

    for e in entidades:
        p = ultima.get(e["id"])
        if not p:
            sem_predicao += 1
            continue

        pontuacao = numero(p.get("pontuacao")) or 0.0
        mrr = numero(p.get("valor_impacto"))
        porte = _atributo_texto(e.get("atributos"), "porte")
        motivos_entidade = sorted(motivos_por_predicao.get(p["id"], []), key=lambda m: -float(m["pontos"]))
        sinais = [descrever_sinal(m) for m in motivos_entidade[:MAX_SINAIS]]

        historico_receita = receita_historico.get(e["id"], [])
        receita_atual = historico_receita[0] if historico_receita else None
        receita_anterior = historico_receita[1] if len(historico_receita) > 1 else None
        variacao_mrr = (
            js_round(((receita_atual - receita_anterior) / receita_anterior) * 100)
            if receita_atual is not None and receita_anterior
            else None
        )

        impacto_relativo = calcular_impacto_relativo(mrr, faixa_receita, porte)
        predicao_anterior = anterior.get(e["id"])

        clientes.append(
            {
                "id": e["id_externo"],
                "entidadeId": e["id"],
                "nome": e.get("nome_exibicao") or e["id_externo"],
                "segmento": _atributo_texto(e.get("atributos"), "segmento"),
                "porte": porte,
                "tipo": _atributo_texto(e.get("atributos"), "plano"),
                "mrr": mrr,
                # Exposição ponderada: MRR anualizado × score/100 (não é previsão de perda).
                "receitaAnualRisco": None if mrr is None else js_round(mrr * 12 * (pontuacao / 100)),
                "scoreRisco": js_round(pontuacao),
                "scoreMax": 100,
                "faixaRisco": p.get("faixa_risco") or "saudavel",
                "tendenciaScore": tendencia(pontuacao, numero(predicao_anterior.get("pontuacao")) if predicao_anterior else None),
                "clienteDesde": str(e["iniciado_em"])[:10] if e.get("iniciado_em") else "",
                "resumoAlerta": "; ".join(sinais) if sinais else RESUMO_SEM_SINAIS,
                "variacaoMrr": variacao_mrr,
                "sinais": sinais,
                "atualizadoEm": str(p["referencia_em"])[:10],
                "cobertura": numero(p.get("cobertura")),
                "scorePrioridade": js_round(calcular_score_prioridade(pontuacao, impacto_relativo) * 10) / 10,
                "impactoRelativo": impacto_relativo,
                "silenciadoAte": silenciado_ate.get(e["id"]),
                "cancelado": e["id"] in cancelado_em,
                "canceladoEm": cancelado_em.get(e["id"]),
                "teste": _atributo_booleano(e.get("atributos"), "teste_motor"),
                "testeOrigem": _atributo_texto(e.get("atributos"), "teste_origem") or None,
                "motivoCancelamento": motivo_por_entidade.get(e["id"]),
                "tokenCompartilhamento": e["token_compartilhamento"],
                "healthPublico": ler_config_health_publico(e.get("atributos")),
            }
        )

    return {"modeloId": modelo_id, "clientes": clientes, "semPredicao": sem_predicao}


def _comparar_prioridade(a: dict, b: dict) -> float:
    return (b["scorePrioridade"] - a["scorePrioridade"]) or (b["scoreRisco"] - a["scoreRisco"])


def ordenar_por_prioridade(clientes: list[dict]) -> list[dict]:
    return sorted(clientes, key=cmp_to_key(_comparar_prioridade))


def montar_fila_do_dia(
    clientes: list[dict], faixas: list[str] | None = None, incluir_silenciados: bool = False
) -> list[dict]:
    """Fila do dia: ativos, nas faixas pedidas (padrão crítico e alerta), sem silenciados, por prioridade."""
    faixas_validas = set(faixas if faixas is not None else FAIXAS_FILA_PADRAO)
    fila = [
        c
        for c in clientes
        if not c["cancelado"]
        and c["faixaRisco"] in faixas_validas
        and (incluir_silenciados or not c["silenciadoAte"])
    ]
    return ordenar_por_prioridade(fila)


def montar_resumo_fila(clientes: list[dict], limite: int = TAMANHO_RESUMO_FILA) -> list[dict]:
    return montar_fila_do_dia(clientes, faixas=TODAS_FAIXAS)[:limite]
