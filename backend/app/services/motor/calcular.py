"""Cálculo e persistência das predições de um projeto.

Etapas (ver ``docs/motor-matematico.md``):

1. data de referência = última observação do projeto (não o relógio);
2. cada regra do modelo normaliza sua métrica para 0–100 — z-score contra a
   carteira (média das últimas N observações) ou média móvel contra o próprio
   histórico —, com tratamento explícito de omissão;
3. score = média ponderada dos sinais avaliáveis; faixa pelo score;
4. grava ``predicoes`` e ``motivos_predicao`` (as evidências do score).
"""

import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone

from app.database import em_lotes
from app.models import entidades as entidades_model
from app.models import metricas as metricas_model
from app.models import motivos as motivos_model
from app.models import observacoes as observacoes_model
from app.models import predicoes as predicoes_model
from app.models import regras as regras_model
from app.services.motor.constantes import (
    CODIGO_METRICA_RECEITA_MENSAL,
    LIMIAR_Z_ACIONADO,
    OMISSAO_SEM_PONTUACAO,
    PADRAO_CLIP_Z,
    PADRAO_JANELA_MEDIA_MOVEL_DIAS,
    PADRAO_JANELA_OBSERVACOES,
)
from app.services.motor.normalizacao import calcular_media_movel, calcular_zscore_carteira
from app.services.motor.score import calcular_predicao_entidade
from app.services.motor.tipos import (
    ConfigRegra,
    ObservacaoNumerica,
    RegraModelo,
    ResultadoPredicao,
    ResultadoRegra,
)
from app.utils.formatacao import iso_js
from app.utils.numeros import eh_numero

TAMANHO_LOTE_PERSISTENCIA = 500
LOTE_FILTRO_IN = 200


@dataclass
class ValorRecente:
    valor: float  # média das últimas N observações
    ultimo_valor: float
    observacoes: int


@dataclass
class ResultadoCalculo:
    predicoes: list[ResultadoPredicao]
    avisos: list[str] = field(default_factory=list)
    referencia_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


def parse_config_regra(bruto: object) -> ConfigRegra | None:
    if not isinstance(bruto, dict):
        return None
    direcao = bruto.get("direcao")
    if direcao not in ("maior_pior", "menor_pior"):
        return None

    pontuacao_omissao = bruto["pontuacao_omissao"] if eh_numero(bruto.get("pontuacao_omissao")) else None
    clip_z = bruto["clip_z"] if eh_numero(bruto.get("clip_z")) else None

    if bruto.get("tipo") == "zscore_carteira":
        janela = bruto.get("janela_observacoes")
        janela_observacoes = int(janela // 1) if eh_numero(janela) and janela >= 1 else PADRAO_JANELA_OBSERVACOES
        return ConfigRegra(
            tipo="zscore_carteira",
            direcao=direcao,
            janela_observacoes=janela_observacoes,
            pontuacao_omissao=pontuacao_omissao,
            clip_z=clip_z,
        )
    if bruto.get("tipo") == "media_movel":
        janela = bruto.get("janela_dias")
        janela_dias = janela if eh_numero(janela) and janela > 0 else PADRAO_JANELA_MEDIA_MOVEL_DIAS
        return ConfigRegra(
            tipo="media_movel",
            direcao=direcao,
            janela_dias=janela_dias,
            pontuacao_omissao=pontuacao_omissao,
            clip_z=clip_z,
        )
    return None


def _valor_recente_por_entidade(
    projeto_id: str, metrica_id: str, referencia_iso: str, janela_observacoes: int
) -> dict[str, ValorRecente]:
    linhas = observacoes_model.listar_numericas_ate(
        projeto_id, metrica_id, referencia_iso, mais_recentes_primeiro=True
    )
    acumulado: dict[str, list[float]] = {}
    for linha in linhas:
        lista = acumulado.setdefault(linha["entidade_id"], [])
        if len(lista) < janela_observacoes:
            lista.append(float(linha["valor_numero"]))

    return {
        entidade_id: ValorRecente(valor=sum(valores) / len(valores), ultimo_valor=valores[0], observacoes=len(valores))
        for entidade_id, valores in acumulado.items()
    }


def _historico_por_entidade(projeto_id: str, metrica_id: str, referencia_iso: str) -> dict[str, list[ObservacaoNumerica]]:
    linhas = observacoes_model.listar_numericas_ate(
        projeto_id, metrica_id, referencia_iso, mais_recentes_primeiro=False
    )
    resultado: dict[str, list[ObservacaoNumerica]] = {}
    for linha in linhas:
        resultado.setdefault(linha["entidade_id"], []).append(
            ObservacaoNumerica(linha["entidade_id"], linha["observado_em"], float(linha["valor_numero"]))
        )
    return resultado


def resolver_referencia_padrao(projeto_id: str) -> datetime | None:
    """A data de referência é a última observação do projeto, não o relógio.

    Com dados mensais que terminam em junho e o relógio em setembro, "agora"
    deixaria a janela recente vazia e zeraria toda regra de média móvel.
    """
    linha = observacoes_model.ultima_observacao(projeto_id)
    if not linha:
        return None
    return datetime.fromisoformat(linha["observado_em"].replace("Z", "+00:00"))


def truncar_ao_dia(momento: datetime) -> datetime:
    utc = momento.astimezone(timezone.utc)
    return datetime(utc.year, utc.month, utc.day, tzinfo=timezone.utc)


def fim_do_dia(dia: datetime) -> datetime:
    return dia + timedelta(days=1) - timedelta(milliseconds=1)


def limiar_acionado(clip_z: float) -> float:
    """Pontuação normalizada equivalente a 1 desvio-padrão (``LIMIAR_Z_ACIONADO``)."""
    return min(100.0, (LIMIAR_Z_ACIONADO / clip_z) * 100)


def motivo_omissao(regra: RegraModelo) -> ResultadoRegra:
    """Sem dado para a regra: por padrão não pontua; com ``pontuacao_omissao`` a ausência vira sinal."""
    pontuacao = regra.config_regra.pontuacao_omissao
    if pontuacao is None:
        pontuacao = OMISSAO_SEM_PONTUACAO
    if pontuacao is None:
        return ResultadoRegra(regra.id, regra.peso, None, {"omissao": True}, None, 0)
    clip_z = regra.config_regra.clip_z or PADRAO_CLIP_Z
    return ResultadoRegra(
        regra_modelo_id=regra.id,
        peso=regra.peso,
        acionado=pontuacao >= limiar_acionado(clip_z),
        valor_observado={"omissao": True},
        valor_normalizado=pontuacao,
        pontos=regra.peso * pontuacao,
    )


def calcular_predicoes_projeto(
    projeto_id: str,
    modelo_id: str,
    referencia_em: datetime | None = None,
    somente_entidades: list[str] | None = None,
) -> ResultadoCalculo:
    avisos: list[str] = []

    referencia_base = referencia_em or resolver_referencia_padrao(projeto_id)
    if referencia_base is None:
        return ResultadoCalculo(
            [], ["Projeto sem observações: não há data de referência para calcular."], truncar_ao_dia(datetime.now(timezone.utc))
        )
    referencia = truncar_ao_dia(referencia_base)
    referencia_iso = iso_js(fim_do_dia(referencia))

    todas_entidades = entidades_model.listar_ids(projeto_id)
    if not todas_entidades:
        return ResultadoCalculo([], ["Nenhuma entidade cadastrada no projeto."], referencia)
    restricao = set(somente_entidades) if somente_entidades is not None else None
    entidade_ids = [e for e in todas_entidades if restricao is None or e in restricao]

    regras_brutas = regras_model.listar(projeto_id, modelo_id)
    if not regras_brutas:
        return ResultadoCalculo([], ["Modelo não possui regras cadastradas em regras_modelo."], referencia)

    regras: list[RegraModelo] = []
    for bruta in regras_brutas:
        config = parse_config_regra(bruta.get("config_regra"))
        if config is None:
            avisos.append(
                f'Regra "{bruta["codigo_sinal"]}" ({bruta["id"]}) tem config_regra inválido/incompleto — ignorada.'
            )
            continue
        regras.append(RegraModelo(bruta["id"], bruta["metrica_id"], bruta["codigo_sinal"], config, float(bruta["peso"])))
    if not regras:
        return ResultadoCalculo([], avisos, referencia)

    def chave_carteira(regra: RegraModelo) -> str:
        janela = regra.config_regra.janela_observacoes if regra.config_regra.tipo == "zscore_carteira" else 1
        return f"{regra.metrica_id}:{janela}"

    valores_carteira: dict[str, dict[str, ValorRecente]] = {}
    historico_por_metrica: dict[str, dict[str, list[ObservacaoNumerica]]] = {}
    for regra in regras:
        if regra.config_regra.tipo == "zscore_carteira" and chave_carteira(regra) not in valores_carteira:
            valores_carteira[chave_carteira(regra)] = _valor_recente_por_entidade(
                projeto_id,
                regra.metrica_id,
                referencia_iso,
                regra.config_regra.janela_observacoes or PADRAO_JANELA_OBSERVACOES,
            )
        if regra.config_regra.tipo == "media_movel" and regra.metrica_id not in historico_por_metrica:
            historico_por_metrica[regra.metrica_id] = _historico_por_entidade(projeto_id, regra.metrica_id, referencia_iso)

    zscore_por_regra: dict[str, dict[str, float]] = {}
    for regra in regras:
        if regra.config_regra.tipo != "zscore_carteira":
            continue
        medias = {entidade: v.valor for entidade, v in valores_carteira[chave_carteira(regra)].items()}
        zscore_por_regra[regra.id] = calcular_zscore_carteira(
            medias, regra.config_regra.direcao, regra.config_regra.clip_z or PADRAO_CLIP_Z
        )

    metrica_receita = metricas_model.buscar_por_codigo(projeto_id, CODIGO_METRICA_RECEITA_MENSAL)
    receita_por_entidade: dict[str, ValorRecente] = {}
    if metrica_receita:
        receita_por_entidade = _valor_recente_por_entidade(projeto_id, metrica_receita["id"], referencia_iso, 1)
    else:
        avisos.append(
            f'Métrica reservada "{CODIGO_METRICA_RECEITA_MENSAL}" não está definida no projeto — o impacto '
            "financeiro (Score de Prioridade) usará o porte da entidade como aproximação."
        )

    fim_referencia = fim_do_dia(referencia)
    resultados: list[ResultadoPredicao] = []

    for entidade_id in entidade_ids:
        motivos: list[ResultadoRegra] = []

        for regra in regras:
            clip_z = regra.config_regra.clip_z or PADRAO_CLIP_Z

            if regra.config_regra.tipo == "zscore_carteira":
                recente = valores_carteira[chave_carteira(regra)].get(entidade_id)
                if recente is None:
                    motivos.append(motivo_omissao(regra))
                    continue

                observado = {
                    "valor": recente.valor,
                    "ultimo_valor": recente.ultimo_valor,
                    "observacoes": recente.observacoes,
                }
                normalizado = zscore_por_regra[regra.id].get(entidade_id)
                if normalizado is None:
                    # Carteira com menos de 2 valores: não há como comparar.
                    motivos.append(ResultadoRegra(regra.id, regra.peso, None, observado, None, 0))
                    continue

                motivos.append(
                    ResultadoRegra(
                        regra.id, regra.peso, normalizado >= limiar_acionado(clip_z), observado, normalizado, regra.peso * normalizado
                    )
                )
                continue

            historico = historico_por_metrica[regra.metrica_id].get(entidade_id, [])
            if not historico:
                motivos.append(motivo_omissao(regra))
                continue

            normalizado = calcular_media_movel(
                historico, fim_referencia, regra.config_regra.janela_dias, regra.config_regra.direcao, clip_z
            )
            if normalizado is None:
                motivos.append(ResultadoRegra(regra.id, regra.peso, None, {"observacoes": len(historico)}, None, 0))
                continue

            motivos.append(
                ResultadoRegra(
                    regra.id,
                    regra.peso,
                    normalizado >= limiar_acionado(clip_z),
                    {"ultimo_valor": historico[-1].valor_numero},
                    normalizado,
                    regra.peso * normalizado,
                )
            )

        receita = receita_por_entidade.get(entidade_id)
        resultados.append(calcular_predicao_entidade(entidade_id, motivos, receita.ultimo_valor if receita else None))

    _persistir(projeto_id, modelo_id, iso_js(referencia), resultados)
    return ResultadoCalculo(resultados, avisos, referencia)


def _persistir(projeto_id: str, modelo_id: str, referencia_iso: str, resultados: list[ResultadoPredicao]) -> None:
    """Upsert das predições do dia e troca completa dos motivos de cada uma."""
    if not resultados:
        return

    entidade_ids = [r.entidade_id for r in resultados]
    existentes: dict[str, str] = {}
    for lote in em_lotes(entidade_ids, LOTE_FILTRO_IN):
        for p in predicoes_model.listar_existentes(modelo_id, referencia_iso, lote):
            existentes[p["entidade_id"]] = p["id"]

    predicao_id = {r.entidade_id: existentes.get(r.entidade_id) or str(uuid.uuid4()) for r in resultados}

    linhas_predicoes = [
        {
            "id": predicao_id[r.entidade_id],
            "projeto_id": projeto_id,
            "entidade_id": r.entidade_id,
            "modelo_id": modelo_id,
            "referencia_em": referencia_iso,
            "pontuacao": r.pontuacao,
            "faixa_risco": r.faixa_risco,
            "cobertura": r.cobertura,
            "valor_impacto": r.valor_impacto,
        }
        for r in resultados
    ]
    for lote in em_lotes(linhas_predicoes, TAMANHO_LOTE_PERSISTENCIA):
        predicoes_model.upsert_lote(lote)

    for lote in em_lotes(list(predicao_id.values()), LOTE_FILTRO_IN):
        motivos_model.apagar_das_predicoes(lote)

    linhas_motivos = [
        {
            "predicao_id": predicao_id[r.entidade_id],
            "regra_modelo_id": m.regra_modelo_id,
            "acionado": m.acionado,
            "valor_observado": m.valor_observado,
            "pontos": m.pontos,
        }
        for r in resultados
        for m in r.motivos
    ]
    for lote in em_lotes(linhas_motivos, TAMANHO_LOTE_PERSISTENCIA):
        motivos_model.inserir_lote(lote)


def resultado_para_dict(r: ResultadoPredicao) -> dict:
    return asdict(r)
