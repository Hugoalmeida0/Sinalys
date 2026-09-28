"""Ingestão agnóstica: upload do arquivo bruto, mapeamento De-Para e normalização em observações/eventos."""

import re
import uuid
from datetime import datetime, timedelta, timezone

from app.config import obter_settings
from app.database import em_lotes
from app.errors import Conflito, ErroApi, ErroValidacao, NaoEncontrado, NaoProcessavel
from app.models import entidades as entidades_model
from app.models import eventos as eventos_model
from app.models import ingestao as ingestao_model
from app.models import metricas as metricas_model
from app.models import observacoes as observacoes_model
from app.services.planilha import Aba, detectar_tipo_origem, ler_planilha, valor_como_texto
from app.utils.formatacao import iso_js

TIPOS_DESTINO_MAPEAMENTO = (
    "id_entidade",
    "atributo_entidade",
    "inicio_entidade",
    "data_observacao",
    "metrica",
    "codigo_evento",
    "data_evento",
    "status_evento",
)

REGEX_DATA_BR = re.compile(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$")
EPOCA_EXCEL = datetime(1899, 12, 30, tzinfo=timezone.utc)


def _vazio(valor) -> bool:
    return valor is None or valor == ""


def parse_data(valor) -> datetime | None:
    if _vazio(valor):
        return None
    if isinstance(valor, datetime):
        return valor if valor.tzinfo else valor.replace(tzinfo=timezone.utc)
    if isinstance(valor, (int, float)) and not isinstance(valor, bool):
        return EPOCA_EXCEL + timedelta(days=float(valor))  # número de série de data do Excel
    texto = str(valor).strip()
    br = REGEX_DATA_BR.match(texto)
    if br:
        dia, mes, ano, hora, minuto = br.groups()
        ano_int = int(ano) + 2000 if len(ano) == 2 else int(ano)
        try:
            return datetime(ano_int, int(mes), int(dia), int(hora or 0), int(minuto or 0), tzinfo=timezone.utc)
        except ValueError:
            return None
    try:
        momento = datetime.fromisoformat(texto.replace("Z", "+00:00"))
    except ValueError:
        return None
    return momento if momento.tzinfo else momento.replace(tzinfo=timezone.utc)


def coagir_valor_metrica(valor_bruto, tipo_valor: str) -> dict | None:
    if _vazio(valor_bruto):
        return None
    if tipo_valor == "numero":
        if isinstance(valor_bruto, (int, float)) and not isinstance(valor_bruto, bool):
            numero = float(valor_bruto)
        else:
            try:
                numero = float(str(valor_bruto).strip().replace(",", ".", 1))
            except ValueError:
                return None
        return {"valor_numero": numero, "valor_texto": None, "valor_booleano": None}
    if tipo_valor == "booleano":
        texto = str(valor_bruto).strip().lower()
        if texto in ("sim", "true", "verdadeiro", "1", "s"):
            return {"valor_numero": None, "valor_texto": None, "valor_booleano": True}
        if texto in ("nao", "não", "false", "falso", "0", "n"):
            return {"valor_numero": None, "valor_texto": None, "valor_booleano": False}
        return None
    return {"valor_numero": None, "valor_texto": valor_como_texto(valor_bruto), "valor_booleano": None}


def _nome_aba(aba: Aba, csv: bool) -> str:
    return "" if csv else aba.nome


def enviar_arquivo(projeto_id: str, nome_arquivo: str, content_type: str | None, conteudo: bytes) -> dict:
    try:
        tipo_origem = detectar_tipo_origem(nome_arquivo)
    except ValueError as erro:
        raise ErroValidacao(str(erro)) from erro

    execucao_id = str(uuid.uuid4())
    bucket = obter_settings().supabase_storage_bucket_ingestao
    caminho = f"{projeto_id}/{execucao_id}/{nome_arquivo}"

    try:
        ingestao_model.enviar_arquivo(bucket, caminho, conteudo, content_type or "application/octet-stream")
    except Exception as erro:  # noqa: BLE001
        raise ErroApi(f"Falha ao arquivar o arquivo original: {erro}") from erro

    try:
        abas = ler_planilha(conteudo, tipo_origem, nome_arquivo)
    except Exception as erro:  # noqa: BLE001
        ingestao_model.remover_arquivo(bucket, caminho)
        raise NaoProcessavel(f"Não foi possível ler o arquivo: {erro}") from erro

    abas_inspecionadas = [
        {"aba_origem": _nome_aba(a, tipo_origem == "csv"), "colunas": a.colunas, "total_linhas": len(a.linhas)} for a in abas
    ]
    try:
        ingestao_model.inserir_execucao(
            {
                "id": execucao_id,
                "projeto_id": projeto_id,
                "tipo_origem": tipo_origem,
                "nome_origem": nome_arquivo,
                "status": "pendente",
                "metadados": {
                    "tamanho_bytes": len(conteudo),
                    "mime_type": content_type or None,
                    "storage_bucket": bucket,
                    "storage_path": caminho,
                    "abas": [{"aba_origem": a["aba_origem"], "total_linhas": a["total_linhas"]} for a in abas_inspecionadas],
                },
            }
        )
    except Exception as erro:  # noqa: BLE001
        ingestao_model.remover_arquivo(bucket, caminho)
        raise ErroApi(f"Falha ao registrar a execução de ingestão: {erro}") from erro

    return {
        "execucao_ingestao_id": execucao_id,
        "projeto_id": projeto_id,
        "tipo_origem": tipo_origem,
        "abas": abas_inspecionadas,
    }


def listar_mapeamentos(execucao_id: str | None) -> dict:
    if not execucao_id:
        raise ErroValidacao("Parâmetro execucao_ingestao_id é obrigatório.")
    return {"mapeamentos": ingestao_model.listar_mapeamentos(execucao_id, com_metrica=True)}


def _validar_mapeamento(m: dict) -> str | None:
    if not m.get("coluna_origem"):
        return "coluna_origem é obrigatório."
    if m.get("tipo_destino") not in TIPOS_DESTINO_MAPEAMENTO:
        return f'tipo_destino "{m.get("tipo_destino")}" inválido. Use um de: {", ".join(TIPOS_DESTINO_MAPEAMENTO)}.'
    if m["tipo_destino"] == "metrica" and not m.get("metrica_id"):
        return f"coluna \"{m['coluna_origem']}\": metrica_id é obrigatório quando tipo_destino = 'metrica'."
    if m["tipo_destino"] != "metrica" and m.get("metrica_id"):
        return f"coluna \"{m['coluna_origem']}\": metrica_id só pode ser informado quando tipo_destino = 'metrica'."
    return None


def salvar_mapeamentos(projeto_padrao: str, dados: dict) -> dict:
    execucao_id = dados.get("execucao_ingestao_id")
    mapeamentos = dados.get("mapeamentos")
    if not execucao_id or not isinstance(mapeamentos, list) or not mapeamentos:
        raise ErroValidacao("execucao_ingestao_id e um array 'mapeamentos' não vazio são obrigatórios.")

    execucao = ingestao_model.buscar_execucao(execucao_id, "id, projeto_id, status")
    if not execucao:
        raise NaoEncontrado("execucao_ingestao_id não encontrado.")
    for m in mapeamentos:
        erro = _validar_mapeamento(m if isinstance(m, dict) else {})
        if erro:
            raise ErroValidacao(erro)

    projeto_id = dados.get("projeto_id") or execucao.get("projeto_id") or projeto_padrao
    linhas = [
        {
            "id": str(uuid.uuid4()),
            "projeto_id": projeto_id,
            "execucao_ingestao_id": execucao_id,
            "aba_origem": m.get("aba_origem") or "",
            "coluna_origem": m["coluna_origem"],
            "tipo_destino": m["tipo_destino"],
            "campo_destino": m.get("campo_destino"),
            "metrica_id": m.get("metrica_id") if m["tipo_destino"] == "metrica" else None,
            "config_transformacao": m.get("config_transformacao") or {},
        }
        for m in mapeamentos
    ]
    try:
        return {"mapeamentos": ingestao_model.upsert_mapeamentos(linhas)}
    except Exception as erro:  # noqa: BLE001
        raise ErroApi(str(erro)) from erro


def _processar(projeto_id: str, execucao_id: str, abas: list[Aba], csv: bool, mapeamentos: list[dict], metricas: list[dict]) -> dict:
    relatorio = {
        "linhas_lidas": 0,
        "entidades_criadas": 0,
        "entidades_atualizadas": 0,
        "observacoes_gravadas": 0,
        "eventos_gravados": 0,
        "erros": [],
    }
    erros: list[str] = relatorio["erros"]
    metrica_por_id = {m["id"]: m for m in metricas}

    for aba_origem in dict.fromkeys(m["aba_origem"] for m in mapeamentos):
        da_aba = [m for m in mapeamentos if m["aba_origem"] == aba_origem]
        mapa_id = next((m for m in da_aba if m["tipo_destino"] == "id_entidade"), None)
        if not mapa_id:
            erros.append(f'Aba "{aba_origem}": nenhuma coluna mapeada como id_entidade — ignorada.')
            continue

        aba = abas[0] if csv and abas else next((a for a in abas if a.nome == aba_origem), None)
        if not aba:
            erros.append(f'Aba "{aba_origem}": Aba "{aba_origem}" não encontrada no arquivo.')
            continue
        linhas = aba.linhas
        relatorio["linhas_lidas"] += len(linhas)

        def primeiro(tipo: str):
            return next((m for m in da_aba if m["tipo_destino"] == tipo), None)

        mapa_data_obs, mapa_inicio = primeiro("data_observacao"), primeiro("inicio_entidade")
        mapa_codigo_evento, mapa_data_evento = primeiro("codigo_evento"), primeiro("data_evento")
        mapas_atributo = [m for m in da_aba if m["tipo_destino"] == "atributo_entidade"]
        mapas_metrica = [m for m in da_aba if m["tipo_destino"] == "metrica"]
        mapas_status = [m for m in da_aba if m["tipo_destino"] == "status_evento"]

        # 1. Entidades: atributos acumulados por código externo.
        por_id_externo: dict[str, dict] = {}
        for linha in linhas:
            bruto = linha.get(mapa_id["coluna_origem"])
            if _vazio(bruto):
                continue
            id_externo = valor_como_texto(bruto).strip()
            atual = por_id_externo.setdefault(id_externo, {"atributos": {}, "iniciado_em": None})
            for m in mapas_atributo:
                valor = linha.get(m["coluna_origem"])
                if not _vazio(valor):
                    atual["atributos"][m.get("campo_destino") or m["coluna_origem"]] = (
                        valor.isoformat() if isinstance(valor, datetime) else valor
                    )
            if mapa_inicio and not atual["iniciado_em"]:
                atual["iniciado_em"] = parse_data(linha.get(mapa_inicio["coluna_origem"]))

        ids_externos = list(por_id_externo)
        existentes: dict[str, dict] = {}
        for lote in em_lotes(ids_externos, 500):
            try:
                for e in entidades_model.listar_por_id_externo(projeto_id, lote):
                    existentes[e["id_externo"]] = e
            except Exception as erro:  # noqa: BLE001
                erros.append(f'Aba "{aba_origem}": falha ao consultar entidades existentes ({erro}).')

        id_por_externo: dict[str, str] = {}
        linhas_entidade = []
        for id_externo in ids_externos:
            dados, existente = por_id_externo[id_externo], existentes.get(id_externo)
            entidade_id = existente["id"] if existente else str(uuid.uuid4())
            relatorio["entidades_atualizadas" if existente else "entidades_criadas"] += 1
            id_por_externo[id_externo] = entidade_id
            linhas_entidade.append(
                {
                    "id": entidade_id,
                    "projeto_id": projeto_id,
                    "id_externo": id_externo,
                    "iniciado_em": (existente or {}).get("iniciado_em")
                    or (iso_js(dados["iniciado_em"]) if dados["iniciado_em"] else None),
                    "atributos": {**((existente or {}).get("atributos") or {}), **dados["atributos"]},
                }
            )
        for lote in em_lotes(linhas_entidade, 500):
            try:
                entidades_model.upsert_lote(lote)
            except Exception as erro:  # noqa: BLE001
                erros.append(f'Aba "{aba_origem}": falha ao gravar entidades ({erro}).')

        # 2. Observações e eventos.
        observacoes: list[dict] = []
        eventos: list[dict] = []
        for linha in linhas:
            bruto = linha.get(mapa_id["coluna_origem"])
            if _vazio(bruto):
                continue
            id_externo = valor_como_texto(bruto).strip()
            entidade_id = id_por_externo.get(id_externo)
            if not entidade_id:
                continue
            data_obs = parse_data(linha.get(mapa_data_obs["coluna_origem"])) if mapa_data_obs else None

            for m in mapas_metrica:
                valor_bruto = linha.get(m["coluna_origem"])
                if _vazio(valor_bruto):
                    continue
                if not data_obs:
                    erros.append(f'Entidade {id_externo}: valor de métrica sem data_observacao válida na aba "{aba_origem}".')
                    continue
                metrica = metrica_por_id.get(m.get("metrica_id"))
                if not metrica:
                    erros.append(f'Coluna "{m["coluna_origem"]}": definição de métrica não encontrada.')
                    continue
                coagido = coagir_valor_metrica(valor_bruto, metrica["tipo_valor"])
                if not coagido:
                    erros.append(
                        f'Entidade {id_externo}: valor "{valor_como_texto(valor_bruto)}" inválido para métrica "{metrica["codigo"]}".'
                    )
                    continue
                observacoes.append(
                    {
                        "id": str(uuid.uuid4()),
                        "projeto_id": projeto_id,
                        "entidade_id": entidade_id,
                        "metrica_id": metrica["id"],
                        "observado_em": iso_js(data_obs),
                        "disponivel_em": iso_js(data_obs),
                        "execucao_ingestao_id": execucao_id,
                        **coagido,
                    }
                )

            data_evento = parse_data(linha.get(mapa_data_evento["coluna_origem"])) if mapa_data_evento else data_obs

            if mapa_codigo_evento:
                codigo = linha.get(mapa_codigo_evento["coluna_origem"])
                if not _vazio(codigo):
                    if data_evento:
                        eventos.append(
                            {
                                "id": str(uuid.uuid4()),
                                "projeto_id": projeto_id,
                                "entidade_id": entidade_id,
                                "codigo_evento": valor_como_texto(codigo).strip(),
                                "ocorrido_em": iso_js(data_evento),
                                "execucao_ingestao_id": execucao_id,
                            }
                        )
                    else:
                        erros.append(f'Entidade {id_externo}: evento sem data_evento válida na aba "{aba_origem}".')

            for m in mapas_status:
                status = linha.get(m["coluna_origem"])
                if _vazio(status):
                    continue
                gatilhos = (m.get("config_transformacao") or {}).get("gatilhos") or {}
                codigo_evento = gatilhos.get(valor_como_texto(status).strip())
                if not codigo_evento:
                    continue
                if not data_evento:
                    erros.append(
                        f'Entidade {id_externo}: status_evento "{valor_como_texto(status)}" sem data associada na aba "{aba_origem}".'
                    )
                    continue
                eventos.append(
                    {
                        "id": str(uuid.uuid4()),
                        "projeto_id": projeto_id,
                        "entidade_id": entidade_id,
                        "codigo_evento": codigo_evento,
                        "ocorrido_em": iso_js(data_evento),
                        "execucao_ingestao_id": execucao_id,
                    }
                )

        for lote in em_lotes(observacoes, 1000):
            try:
                relatorio["observacoes_gravadas"] += observacoes_model.upsert_lote(lote)
            except Exception as erro:  # noqa: BLE001
                erros.append(f'Aba "{aba_origem}": falha ao gravar observações ({erro}).')
        for lote in em_lotes(eventos, 1000):
            try:
                relatorio["eventos_gravados"] += eventos_model.upsert_lote(lote)
            except Exception as erro:  # noqa: BLE001
                erros.append(f'Aba "{aba_origem}": falha ao gravar eventos ({erro}).')

    return relatorio


def processar(dados: dict) -> dict:
    execucao_id = dados.get("execucao_ingestao_id")
    if not execucao_id:
        raise ErroValidacao("execucao_ingestao_id é obrigatório.")

    execucao = ingestao_model.buscar_execucao(execucao_id, "id, projeto_id, tipo_origem, status, metadados, nome_origem")
    if not execucao:
        raise NaoEncontrado("execucao_ingestao_id não encontrado.")
    if execucao["status"] == "processando":
        raise Conflito("Esta execução já está sendo processada.")

    mapeamentos = ingestao_model.listar_mapeamentos(execucao_id)
    if not mapeamentos:
        raise NaoProcessavel("Nenhum mapeamento De-Para definido para esta execução (Task 2.2).")

    metricas = metricas_model.listar_por_ids(list({m["metrica_id"] for m in mapeamentos if m.get("metrica_id")}))
    metadados = execucao.get("metadados") or {}
    if not metadados.get("storage_bucket") or not metadados.get("storage_path"):
        raise NaoProcessavel("Execução sem arquivo bruto arquivado (metadados.storage_path ausente).")

    ingestao_model.atualizar_execucao(execucao_id, {"status": "processando"})
    try:
        conteudo = ingestao_model.baixar_arquivo(metadados["storage_bucket"], metadados["storage_path"])
    except Exception as erro:  # noqa: BLE001
        ingestao_model.atualizar_execucao(
            execucao_id, {"status": "falhou", "detalhes_erro": {"mensagem": f"Falha ao baixar arquivo do storage: {erro}"}}
        )
        raise ErroApi("Falha ao baixar o arquivo original do storage.") from erro

    csv = execucao["tipo_origem"] == "csv"
    try:
        abas = ler_planilha(conteudo, execucao["tipo_origem"], execucao.get("nome_origem") or metadados["storage_path"])
        relatorio = _processar(execucao["projeto_id"], execucao_id, abas, csv, mapeamentos, metricas)
    except Exception as erro:  # noqa: BLE001
        ingestao_model.atualizar_execucao(execucao_id, {"status": "falhou", "detalhes_erro": {"mensagem": str(erro)}})
        raise ErroApi(f"Falha ao processar: {erro}") from erro

    status_final = "falhou" if relatorio["erros"] and relatorio["observacoes_gravadas"] == 0 else "concluido"
    ingestao_model.atualizar_execucao(
        execucao_id,
        {
            "status": status_final,
            "concluido_em": iso_js(datetime.now(timezone.utc)),
            "detalhes_erro": {"erros": relatorio["erros"]} if relatorio["erros"] else None,
        },
    )
    return {"execucao_ingestao_id": execucao_id, "status": status_final, "relatorio": relatorio}
