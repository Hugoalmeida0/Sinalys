"""KPIs do painel inicial."""

from datetime import datetime, timedelta, timezone
from statistics import median

from app.database import em_paralelo
from app.models import contatos as contatos_model
from app.models import eventos as eventos_model
from app.models import predicoes as predicoes_model
from app.models import projetos as projetos_model
from app.services.motor.faixa import FAIXAS_FILA_PADRAO
from app.utils.formatacao import iso_js
from app.utils.numeros import js_round

DIAS_POR_MES = 30.44
JANELA_CONTATADOS_DIAS = 7
JANELA_RECEITA_SALVA_DIAS = 30
FAIXAS_ALERTA = set(FAIXAS_FILA_PADRAO)
MS_POR_DIA = 86_400_000


def _ms(iso: str) -> float:
    return datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp() * 1000


def _arredondar1(n: float) -> float:
    return js_round(n * 10) / 10


def calcular_antecedencias(projeto_id: str, modelo_id: str) -> list[float]:
    """Para cada cancelamento: há quantos meses a entidade estava em alerta contínuo antes dele."""
    projeto, eventos_brutos = em_paralelo(
        lambda: projetos_model.buscar_info(projeto_id),
        lambda: eventos_model.listar_do_projeto(projeto_id),
    )
    if not projeto:
        return []

    eventos = [e for e in eventos_brutos if e["codigo_evento"] == projeto["codigo_evento_alvo"]]
    if not eventos:
        return []

    entidades = list(dict.fromkeys(e["entidade_id"] for e in eventos))
    por_entidade: dict[str, list[dict]] = {}
    for p in predicoes_model.listar_series(projeto_id, modelo_id, entidades):
        por_entidade.setdefault(p["entidade_id"], []).append(p)

    meses: list[float] = []
    for evento in eventos:
        ocorrido = _ms(evento["ocorrido_em"])
        inicio_sequencia: float | None = None
        for p in por_entidade.get(evento["entidade_id"], []):
            ref = _ms(p["referencia_em"])
            if ref >= ocorrido:
                break
            if p.get("faixa_risco") in FAIXAS_ALERTA:
                if inicio_sequencia is None:
                    inicio_sequencia = ref
            else:
                inicio_sequencia = None
        if inicio_sequencia is not None:
            meses.append((ocorrido - inicio_sequencia) / (MS_POR_DIA * DIAS_POR_MES))
    return meses


def calcular_receita_salva(projeto_id: str, modelo_id: str) -> tuple[float, int]:
    """Receita anualizada das entidades que saíram do alerta na última janela de 30 dias."""
    predicoes = predicoes_model.listar_series(projeto_id, modelo_id)
    if not predicoes:
        return 0.0, 0

    ultima_referencia = max(_ms(p["referencia_em"]) for p in predicoes)
    desde = ultima_referencia - JANELA_RECEITA_SALVA_DIAS * MS_POR_DIA

    por_entidade: dict[str, list[dict]] = {}
    for p in predicoes:
        por_entidade.setdefault(p["entidade_id"], []).append(p)

    receita = 0.0
    recuperados = 0
    for serie in por_entidade.values():
        for i in range(len(serie) - 1, 0, -1):
            atual, anterior = serie[i], serie[i - 1]
            atual_em_alerta = atual.get("faixa_risco") in FAIXAS_ALERTA
            anterior_em_alerta = anterior.get("faixa_risco") in FAIXAS_ALERTA
            dentro_da_janela = _ms(atual["referencia_em"]) >= desde

            if not atual_em_alerta and anterior_em_alerta and dentro_da_janela:
                receita += (0.0 if atual.get("valor_impacto") is None else float(atual["valor_impacto"])) * 12
                recuperados += 1
                break
            if i == len(serie) - 1 and atual_em_alerta:
                break
    return receita, recuperados


def contar_contatados(projeto_id: str, agora: datetime) -> int:
    desde = agora - timedelta(days=JANELA_CONTATADOS_DIAS)
    return len(set(contatos_model.entidades_contatadas_entre(projeto_id, iso_js(desde), iso_js(agora))))


def calcular_kpis_painel(projeto_id: str, modelo_id: str, clientes: list[dict], agora: datetime | None = None) -> dict:
    agora = agora or datetime.now(timezone.utc)
    em_alerta = [c for c in clientes if c["faixaRisco"] in FAIXAS_ALERTA and not c["silenciadoAte"] and not c["cancelado"]]

    antecedencias, contatados, (receita_salva, recuperados) = em_paralelo(
        lambda: calcular_antecedencias(projeto_id, modelo_id),
        lambda: contar_contatados(projeto_id, agora),
        lambda: calcular_receita_salva(projeto_id, modelo_id),
    )

    return {
        # Exposição ponderada anual das contas em alerta (não é previsão de perda).
        "receitaEmRiscoAno": sum(c["receitaAnualRisco"] or 0 for c in em_alerta),
        "clientesEmAlerta": len(em_alerta),
        "totalCarteira": len(clientes),
        "antecedenciaMediaMeses": _arredondar1(sum(antecedencias) / len(antecedencias)) if antecedencias else None,
        "antecedenciaMedianaMeses": _arredondar1(median(antecedencias)) if antecedencias else None,
        "antecedenciaMaximaMeses": _arredondar1(max(antecedencias)) if antecedencias else None,
        "desfechosAntecipados": len(antecedencias),
        "clientesContatados7d": contatados,
        "receitaSalva30d": receita_salva,
        "clientesRecuperados30d": recuperados,
    }


KPIS_VAZIOS = {
    "receitaEmRiscoAno": 0,
    "clientesEmAlerta": 0,
    "totalCarteira": 0,
    "antecedenciaMediaMeses": None,
    "antecedenciaMedianaMeses": None,
    "antecedenciaMaximaMeses": None,
    "desfechosAntecipados": 0,
    "clientesContatados7d": 0,
    "receitaSalva30d": 0,
    "clientesRecuperados30d": 0,
}
