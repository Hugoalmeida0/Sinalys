"""Casos de uso de leitura do painel (o que cada tela e rota ``/api/painel/*`` consome)."""

from app.errors import NaoEncontrado, SemModeloAtivoError
from app.models import modelos as modelos_model
from app.models import predicoes as predicoes_model
from app.services.motor.faixa import FAIXAS_FILA_PADRAO, TODAS_FAIXAS
from app.services.motor.urgencia import ordenar_fila_urgencia
from app.services.painel.clientes import montar_clientes_painel, montar_fila_do_dia, montar_resumo_fila
from app.services.painel.detalhe import montar_detalhe_cliente
from app.services.painel.kpis import KPIS_VAZIOS, calcular_kpis_painel
from app.utils.numeros import js_round


def resolver_modelo(projeto_id: str, modelo_explicito: str | None = None) -> str:
    modelo_id = modelo_explicito or modelos_model.id_modelo_ativo(projeto_id)
    if not modelo_id:
        raise SemModeloAtivoError("Nenhum modelo ativo encontrado. Informe 'modelo_id' via query string.")
    return modelo_id


def listar_carteira(projeto_id: str, modelo_id: str) -> dict:
    resultado = montar_clientes_painel(projeto_id, modelo_id)
    clientes = sorted(resultado["clientes"], key=lambda c: -c["scoreRisco"])
    total = len(clientes)
    resumo = [
        {
            "faixa": faixa,
            "total": (n := len([c for c in clientes if c["faixaRisco"] == faixa])),
            "percentual": js_round((n / total) * 100) if total else 0,
        }
        for faixa in TODAS_FAIXAS
    ]
    return {
        "projeto_id": projeto_id,
        "modelo_id": modelo_id,
        "sem_predicao": resultado["semPredicao"],
        "resumo_carteira": resumo,
        "clientes": clientes,
    }


def listar_fila(
    projeto_id: str, modelo_id: str, faixas_param: str | None, incluir_silenciados: bool, segmento: str | None
) -> dict:
    if faixas_param == "todas":
        faixas = TODAS_FAIXAS
    elif faixas_param:
        faixas = [f for f in faixas_param.split(",") if f in TODAS_FAIXAS]
    else:
        faixas = FAIXAS_FILA_PADRAO

    resultado = montar_clientes_painel(projeto_id, modelo_id)
    clientes = resultado["clientes"]
    fila = montar_fila_do_dia(clientes, faixas=faixas, incluir_silenciados=incluir_silenciados)
    if segmento:
        fila = [c for c in fila if c["segmento"] == segmento]

    return {
        "projeto_id": projeto_id,
        "modelo_id": modelo_id,
        "segmentos": sorted({c["segmento"] for c in clientes if c["segmento"]}),
        "total_carteira": len(clientes),
        "sem_predicao": resultado["semPredicao"],
        "fila": fila,
    }


def kpis(projeto_id: str, modelo_id: str) -> dict:
    clientes = montar_clientes_painel(projeto_id, modelo_id)["clientes"]
    return {"projeto_id": projeto_id, "modelo_id": modelo_id, "kpis": calcular_kpis_painel(projeto_id, modelo_id, clientes)}


def inicio(projeto_id: str) -> dict:
    """Tela inicial: o resumo da fila (5 primeiros por prioridade) e o tamanho da carteira."""
    modelo_id = modelos_model.id_modelo_ativo(projeto_id)
    if not modelo_id:
        return {"modelo_id": None, "total_clientes": 0, "fila": []}
    clientes = montar_clientes_painel(projeto_id, modelo_id)["clientes"]
    return {"modelo_id": modelo_id, "total_clientes": len(clientes), "fila": montar_resumo_fila(clientes)}


def kpis_inicio(projeto_id: str) -> dict:
    modelo_id = modelos_model.id_modelo_ativo(projeto_id)
    if not modelo_id:
        return {"modelo_id": None, "kpis": KPIS_VAZIOS}
    return kpis(projeto_id, modelo_id)


def detalhe_cliente(projeto_id: str, identificador: str) -> dict:
    modelo_id = modelos_model.id_modelo_ativo(projeto_id)
    if not modelo_id:
        raise NaoEncontrado("Nenhum modelo de risco ativo no projeto.")
    clientes = montar_clientes_painel(projeto_id, modelo_id)["clientes"]
    cliente = next((c for c in clientes if c["id"] == identificador or c["entidadeId"] == identificador), None)
    if not cliente:
        raise NaoEncontrado(f'Cliente "{identificador}" não encontrado.')
    return montar_detalhe_cliente(projeto_id, modelo_id, cliente)


def fila_urgencia_legada(projeto_id: str, modelo_id: str) -> dict:
    """``GET /api/motor/fila``: última predição de cada entidade, ordenada por risco × receita."""
    mais_recente: dict[str, dict] = {}
    for p in predicoes_model.listar_do_modelo(projeto_id, modelo_id):
        mais_recente.setdefault(p["entidade_id"], p)
    fila = ordenar_fila_urgencia(
        [
            {
                **p,
                "pontuacao": float(p["pontuacao"]),
                "valor_impacto": None if p.get("valor_impacto") is None else float(p["valor_impacto"]),
            }
            for p in mais_recente.values()
        ]
    )
    return {"projeto_id": projeto_id, "modelo_id": modelo_id, "fila": fila}
