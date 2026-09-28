"""Detalhe do cliente: evidências do score, explicação, evolução, histórico e base do simulador."""

from datetime import datetime, timezone

from app.database import em_paralelo
from app.models import contatos as contatos_model
from app.models import diagnosticos as diagnosticos_model
from app.models import eventos as eventos_model
from app.models import predicoes as predicoes_model
from app.services.constantes import PREFIXO_SOLICITACAO_AGENDAMENTO, TIPOS_CONTATO
from app.services.ia.contexto import ContextoAtual, SinalRisco, montar_contexto_atual
from app.utils.formatacao import formatar_numero_ptbr, iso_js
from app.utils.numeros import js_round, numero

MESES_EVOLUCAO = 12
MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

AVALIACAO_SEM_DIAGNOSTICO = (
    "Diagnóstico de IA ainda não gerado para este cliente. Gere um diagnóstico para receber a análise prescritiva."
)

ACOES_PADRAO = [
    {"id": "a1", "titulo": "Entrar em contato com o cliente", "concluida": False},
    {"id": "a2", "titulo": "Registrar no CRM", "concluida": False},
]


def severidade_do_sinal(s: SinalRisco) -> str:
    normalizado = s.pontos / s.peso if s.peso > 0 else 0
    if normalizado >= 70:
        return "critica"
    if normalizado >= 40:
        return "alta"
    return "media"


def titulo_da_evidencia(s: SinalRisco) -> str:
    obs = s.valor_observado or {}
    if obs.get("omissao") is True:
        return f"{s.metrica}: sem dados no período (omissão tratada como risco)"
    bruto = obs.get("valor") if obs.get("valor") is not None else obs.get("ultimo_valor")
    valor = numero(bruto)
    if valor is None:
        return f"{s.metrica} fora do padrão"
    unidade = f" {s.unidade}" if s.unidade else ""
    return f"{s.metrica} em {formatar_numero_ptbr(valor, max_casas=1)}{unidade}, fora do padrão da carteira"


def montar_explicacao_risco(contexto: ContextoAtual) -> str:
    """Explica o score só com o que o motor calculou: quais sinais pesaram e quanto."""
    acionados = sorted((s for s in contexto.sinais if s.acionado is True), key=lambda s: -s.pontos)
    abertura = f"Score {js_round(contexto.pontuacao)}/100 (faixa {contexto.faixa_risco or 'indefinida'})."

    if not acionados:
        return (
            f"{abertura} Nenhum sinal de risco individual foi acionado pelo motor — o score reflete o "
            "comportamento geral da conta frente à carteira."
        )

    total = sum(s.pontos for s in acionados) or 1
    principais = []
    for s in acionados[:3]:
        participacao = js_round((s.pontos / total) * 100)
        obs = s.valor_observado or {}
        if obs.get("omissao") is True:
            causa = "sem dado reportado no período"
        else:
            causa = titulo_da_evidencia(s).replace(f"{s.metrica}: ", "", 1).replace(f"{s.metrica} ", "", 1)
        principais.append(f"{s.metrica} ({causa}, responde por {participacao}% do score)")

    cobertura = ""
    if contexto.cobertura is not None and contexto.cobertura < 1:
        cobertura = (
            f" Apenas {js_round(contexto.cobertura * 100)}% das regras do modelo puderam ser avaliadas para este cliente."
        )

    return f"{abertura} Principal(is) motivo(s): {'; '.join(principais)}.{cobertura}"


def _rotulo_mes(iso: str) -> str:
    d = datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(timezone.utc)
    return f"{MESES_CURTOS[d.month - 1]}/{str(d.year)[2:]}"


def _inicio_janela_evolucao(agora: datetime) -> datetime:
    """Primeiro dia do mês, ``MESES_EVOLUCAO - 1`` meses atrás (UTC)."""
    indice = agora.year * 12 + (agora.month - 1) - (MESES_EVOLUCAO - 1)
    return datetime(indice // 12, indice % 12 + 1, 1, tzinfo=timezone.utc)


def montar_detalhe_cliente(projeto_id: str, modelo_id: str, cliente: dict) -> dict:
    entidade = {"id": cliente["entidadeId"], "id_externo": cliente["id"], "nome_exibicao": cliente["nome"]}
    inicio_janela = _inicio_janela_evolucao(datetime.now(timezone.utc))

    contexto, evolucao, diagnostico, contatos, eventos = em_paralelo(
        lambda: montar_contexto_atual(projeto_id, entidade, modelo_id),
        lambda: predicoes_model.evolucao_da_entidade(cliente["entidadeId"], modelo_id, iso_js(inicio_janela)),
        lambda: diagnosticos_model.buscar_ultimo_da_entidade(
            cliente["entidadeId"],
            "diagnostico_principal, analise_lookalike, plano_acao_imediato, criado_em",
            projeto_id=projeto_id,
        ),
        lambda: contatos_model.listar_da_entidade(
            cliente["entidadeId"], 50, "id, tipo, realizado_em, resumo, proximo_passo, autor_nome"
        ),
        lambda: eventos_model.listar_da_entidade(cliente["entidadeId"], 20),
    )

    acionados = [s for s in contexto.sinais if s.acionado is True]
    evidencias = [
        {"id": f"e{i + 1}", "severidade": severidade_do_sinal(s), "titulo": titulo_da_evidencia(s)}
        for i, s in enumerate(acionados)
    ]

    # Sinais dentro do padrão viram candidatos a destaque positivo na página pública.
    destaques_disponiveis = [{"codigo": s.codigo_sinal, "rotulo": s.metrica} for s in contexto.sinais if s.acionado is False]

    simulacao = {
        "scoreRisco": cliente["scoreRisco"],
        "somaPesos": sum(s.peso for s in contexto.sinais if s.acionado is not None),
        "mrr": cliente["mrr"],
        "impactoRelativo": cliente["impactoRelativo"],
        "sinais": [
            {
                "codigo": s.codigo_sinal,
                "metrica": s.metrica,
                "peso": s.peso,
                "pontos": s.pontos,
                "descricao": titulo_da_evidencia(s),
            }
            for s in acionados
        ],
    }

    por_mes: dict[str, float] = {}
    for p in evolucao:
        por_mes[_rotulo_mes(p["referencia_em"])] = float(p["pontuacao"])
    evolucao_score = [{"mes": mes, "score": js_round(score)} for mes, score in por_mes.items()]

    plano = []
    if diagnostico and isinstance(diagnostico.get("plano_acao_imediato"), list):
        plano = [a for a in diagnostico["plano_acao_imediato"] if isinstance(a, str)]
    proximas_acoes = (
        [{"id": f"a{i + 1}", "titulo": titulo, "concluida": False} for i, titulo in enumerate(plano)]
        if plano
        else ACOES_PADRAO
    )

    historico = []
    for c in contatos:
        historico.append(
            {
                "id": f"c-{c['id']}",
                "data": str(c["realizado_em"])[:10],
                "tipo": "reuniao" if c["tipo"] in ("reuniao_presencial", "videochamada") else "contato",
                "titulo": (
                    "Cliente pediu uma call de alinhamento"
                    if c["resumo"].startswith(PREFIXO_SOLICITACAO_AGENDAMENTO)
                    else TIPOS_CONTATO.get(c["tipo"], c["tipo"])
                ),
                "descricao": f"{c['resumo']} Próximo passo: {c['proximo_passo']}." if c.get("proximo_passo") else c["resumo"],
                "autor": c.get("autor_nome"),
            }
        )
    for e in eventos:
        historico.append(
            {
                "id": f"ev-{e['id']}",
                "data": str(e["ocorrido_em"])[:10],
                "tipo": "sistema",
                "titulo": f"Evento registrado: {e['codigo_evento']}",
                "descricao": "Desfecho importado na ingestão de dados.",
            }
        )
    if diagnostico:
        historico.append(
            {
                "id": "ia-ultimo",
                "data": str(diagnostico["criado_em"])[:10],
                "tipo": "sinal",
                "titulo": "Diagnóstico de IA gerado",
                "descricao": diagnostico["diagnostico_principal"],
            }
        )
    historico.sort(key=lambda h: h["data"], reverse=True)

    autor_mais_recente = next((c["autor_nome"] for c in contatos if c.get("autor_nome")), None)

    partes_resumo = [
        f"{contexto.rotulo_entidade} do segmento {cliente['segmento'] or 'não informado'}",
        f"de porte {cliente['porte'].lower()}" if cliente["porte"] else None,
        f"com plano {cliente['tipo']}" if cliente["tipo"] else None,
    ]
    resumo_cliente = ", ".join(p for p in partes_resumo if p) + f". {cliente['resumoAlerta']}."

    return {
        **cliente,
        "nomeFantasia": f"{cliente['id']} – {cliente['segmento'] or contexto.rotulo_entidade}",
        "responsavelCS": autor_mais_recente or "Não atribuído",
        "evidencias": evidencias,
        "proximasAcoes": proximas_acoes,
        "avaliacaoIA": diagnostico["diagnostico_principal"] if diagnostico else AVALIACAO_SEM_DIAGNOSTICO,
        "analiseLookalike": diagnostico.get("analise_lookalike") if diagnostico else None,
        "diagnosticoGeradoEm": diagnostico.get("criado_em") if diagnostico else None,
        "historico": historico,
        "evolucaoScore": evolucao_score,
        "explicacaoRisco": montar_explicacao_risco(contexto),
        "destaquesDisponiveis": destaques_disponiveis,
        "simulacao": simulacao,
        "resumoCliente": resumo_cliente,
    }
