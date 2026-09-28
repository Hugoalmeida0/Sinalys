"""Leitura e calibração do modelo ativo (pesos e regras)."""

import math
import uuid

from app.database import em_paralelo
from app.errors import RegraInvalidaError, SemModeloAtivoError
from app.models import metricas as metricas_model
from app.models import modelos as modelos_model
from app.models import regras as regras_model
from app.services.motor.calcular import calcular_predicoes_projeto
from app.services.motor.constantes import (
    CODIGO_METRICA_RECEITA_MENSAL,
    DIRECOES,
    PADRAO_JANELA_MEDIA_MOVEL_DIAS,
    PADRAO_JANELA_OBSERVACOES,
    TIPOS_REGRA,
)
from app.utils.numeros import eh_numero


def _relacao(valor):
    if valor is None:
        return None
    if isinstance(valor, list):
        return valor[0] if valor else None
    return valor


def carregar_modelo_ativo_detalhado(projeto_id: str) -> dict | None:
    modelo = modelos_model.buscar_modelo_ativo(projeto_id)
    if not modelo:
        return None

    regras_brutas, metricas = em_paralelo(
        lambda: regras_model.listar_com_metrica(modelo["id"]),
        # Receita mensal é impacto financeiro, nunca sinal de risco.
        lambda: metricas_model.listar_numericas_exceto(projeto_id, CODIGO_METRICA_RECEITA_MENSAL),
    )

    metricas_usadas = {r["metrica_id"] for r in regras_brutas}
    regras = []
    for r in regras_brutas:
        metrica = _relacao(r.get("definicoes_metricas")) or {}
        config = r.get("config_regra") or {}
        regras.append(
            {
                "id": r["id"],
                "codigo_sinal": r["codigo_sinal"],
                "metrica_id": r["metrica_id"],
                "metrica_codigo": metrica.get("codigo") or "",
                "metrica_rotulo": metrica.get("rotulo") or r["codigo_sinal"],
                "metrica_unidade": metrica.get("unidade"),
                "tipo": config.get("tipo") or "zscore_carteira",
                "direcao": config.get("direcao") or "maior_pior",
                "janela_dias": config["janela_dias"] if eh_numero(config.get("janela_dias")) else None,
                "janela_observacoes": (
                    (config["janela_observacoes"] if eh_numero(config.get("janela_observacoes")) else PADRAO_JANELA_OBSERVACOES)
                    if config.get("tipo") == "zscore_carteira"
                    else None
                ),
                "pontuacao_omissao": config["pontuacao_omissao"] if eh_numero(config.get("pontuacao_omissao")) else None,
                "peso": float(r["peso"]),
            }
        )
    regras.sort(key=lambda r: -r["peso"])

    return {
        "modelo_id": modelo["id"],
        "versao": modelo["versao"],
        "regras": regras,
        "metricas_disponiveis": [
            {"id": m["id"], "codigo": m["codigo"], "rotulo": m["rotulo"], "unidade": m.get("unidade")}
            for m in metricas
            if m["id"] not in metricas_usadas
        ],
    }


def exigir_modelo_ativo(projeto_id: str) -> str:
    modelo_id = modelos_model.id_modelo_ativo(projeto_id)
    if not modelo_id:
        raise SemModeloAtivoError("Nenhum modelo ativo encontrado para este projeto.")
    return modelo_id


def atualizar_pesos(projeto_id: str, modelo_id: str, atualizacoes: list[dict]) -> None:
    for a in atualizacoes:
        if not math.isfinite(a["peso"]) or a["peso"] < 0:
            raise RegraInvalidaError(
                f"Peso inválido para a regra {a['id']}: deve ser um número maior ou igual a 0."
            )
    for a in atualizacoes:
        if not regras_model.atualizar_peso(a["id"], projeto_id, modelo_id, a["peso"]):
            raise RegraInvalidaError(f"Regra {a['id']} não encontrada no modelo ativo deste projeto.")


def criar_regra(
    projeto_id: str,
    modelo_id: str,
    metrica_id: str,
    tipo: str,
    direcao: str,
    peso: float,
    janela_dias: float | None = None,
    janela_observacoes: float | None = None,
    pontuacao_omissao: float | None = None,
) -> str:
    if tipo not in TIPOS_REGRA:
        raise RegraInvalidaError(f'Tipo de regra inválido: "{tipo}".')
    if direcao not in DIRECOES:
        raise RegraInvalidaError(f'Direção de risco inválida: "{direcao}".')
    if not math.isfinite(peso) or peso < 0:
        raise RegraInvalidaError("Peso deve ser um número maior ou igual a 0.")
    if tipo == "media_movel" and janela_dias is not None and (not float(janela_dias).is_integer() or janela_dias <= 0):
        raise RegraInvalidaError("Janela (dias) deve ser um número inteiro maior que 0.")
    if (
        tipo == "zscore_carteira"
        and janela_observacoes is not None
        and (not float(janela_observacoes).is_integer() or janela_observacoes <= 0)
    ):
        raise RegraInvalidaError("Janela (observações) deve ser um número inteiro maior que 0.")
    if pontuacao_omissao is not None and (
        not math.isfinite(pontuacao_omissao) or pontuacao_omissao < 0 or pontuacao_omissao > 100
    ):
        raise RegraInvalidaError("Pontuação de omissão deve estar entre 0 e 100.")

    metrica = metricas_model.buscar(projeto_id, metrica_id)
    if not metrica:
        raise RegraInvalidaError("Métrica não encontrada neste projeto.")
    if metrica["tipo_valor"] != "numero":
        raise RegraInvalidaError("Só métricas numéricas podem virar regra de risco.")
    if metrica["codigo"] == CODIGO_METRICA_RECEITA_MENSAL:
        raise RegraInvalidaError("Receita mensal é o impacto financeiro, não pode virar sinal de risco.")

    if tipo == "media_movel":
        config = {"tipo": tipo, "direcao": direcao, "janela_dias": janela_dias if janela_dias is not None else PADRAO_JANELA_MEDIA_MOVEL_DIAS}
    else:
        config = {
            "tipo": tipo,
            "direcao": direcao,
            "janela_observacoes": janela_observacoes if janela_observacoes is not None else PADRAO_JANELA_OBSERVACOES,
        }
    if pontuacao_omissao is not None:
        config["pontuacao_omissao"] = pontuacao_omissao

    regra_id = str(uuid.uuid4())
    try:
        regras_model.inserir(
            {
                "id": regra_id,
                "projeto_id": projeto_id,
                "modelo_id": modelo_id,
                "metrica_id": metrica_id,
                "codigo_sinal": f"{metrica['codigo']}_{tipo}",
                "config_regra": config,
                "peso": peso,
            }
        )
    except regras_model.RegraDuplicada as erro:
        raise RegraInvalidaError("Esta métrica já tem uma regra deste tipo no modelo.") from erro
    return regra_id


def recalcular_e_devolver_modelo(projeto_id: str, modelo_id: str) -> dict:
    """Salvar o modelo recalcula a carteira na hora: a tela seguinte já mostra os scores novos."""
    resultado = calcular_predicoes_projeto(projeto_id, modelo_id)
    detalhe = carregar_modelo_ativo_detalhado(projeto_id) or {}
    return {
        **detalhe,
        "recalculo": {"total_entidades": len(resultado.predicoes), "avisos": resultado.avisos},
    }
