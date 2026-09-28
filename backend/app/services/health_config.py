"""Configuração da página pública de Health Score (guardada em ``entidades.atributos``)."""

from urllib.parse import urlsplit, urlunsplit

CHAVE_ATRIBUTO_HEALTH_PUBLICO = "health_publico"
MAX_DESTAQUES_HEALTH = 6
DESTAQUES_AUTOMATICOS = 3
MAX_TAMANHO_LINK_AGENDAMENTO = 500

BENEFICIOS_PLANO = [
    {
        "codigo": "suporte_prioritario",
        "texto": "Suporte prioritário, com tempo de resposta reduzido para chamados críticos",
    },
    {"codigo": "consultoria_trimestral", "texto": "Consultoria estratégica trimestral com seu time de sucesso"},
    {"codigo": "acesso_antecipado", "texto": "Acesso antecipado a novos recursos antes do lançamento geral"},
]

CONFIG_HEALTH_PADRAO = {"destaques": None, "beneficios": None, "linkAgendamento": None, "atualizadoEm": None}


def _lista_de_strings(valor) -> list[str] | None:
    if not isinstance(valor, list):
        return None
    return [v for v in valor if isinstance(v, str) and v.strip()]


def ler_config_health_publico(atributos) -> dict:
    if not isinstance(atributos, dict):
        return dict(CONFIG_HEALTH_PADRAO)
    bruto = atributos.get(CHAVE_ATRIBUTO_HEALTH_PUBLICO)
    if not isinstance(bruto, dict):
        return dict(CONFIG_HEALTH_PADRAO)
    link = bruto.get("link_agendamento").strip() if isinstance(bruto.get("link_agendamento"), str) else ""
    return {
        "destaques": _lista_de_strings(bruto.get("destaques")),
        "beneficios": _lista_de_strings(bruto.get("beneficios")),
        "linkAgendamento": link or None,
        "atualizadoEm": bruto.get("atualizado_em") if isinstance(bruto.get("atualizado_em"), str) else None,
    }


def serializar_config_health_publico(config: dict) -> dict:
    return {
        "destaques": config["destaques"],
        "beneficios": config["beneficios"],
        "link_agendamento": config["linkAgendamento"],
        "atualizado_em": config["atualizadoEm"],
    }


def validar_link_agendamento(valor) -> tuple[str | None, str | None]:
    """Devolve ``(link_normalizado, erro)``. Vazio ou nulo é válido e remove o link."""
    if valor is None:
        return None, None
    if not isinstance(valor, str):
        return None, "Link de agendamento deve ser um texto."
    texto = valor.strip()
    if not texto:
        return None, None
    if len(texto) > MAX_TAMANHO_LINK_AGENDAMENTO:
        return None, f"Link de agendamento deve ter no máximo {MAX_TAMANHO_LINK_AGENDAMENTO} caracteres."
    partes = urlsplit(texto)
    if not partes.scheme or not (partes.netloc or partes.path):
        return None, "Link de agendamento inválido. Use uma URL completa, começando com https://."
    if partes.scheme.lower() not in ("http", "https"):
        return None, "Link de agendamento precisa começar com http:// ou https://."
    if not partes.netloc:
        return None, "Link de agendamento inválido. Use uma URL completa, começando com https://."
    # Mesma normalização do `new URL(...).toString()`: esquema e host minúsculos, caminho vazio vira "/".
    normalizado = urlunsplit(
        (partes.scheme.lower(), partes.netloc.lower(), partes.path or "/", partes.query, partes.fragment)
    )
    return normalizado, None


def resolver_beneficios(config: dict) -> list[dict]:
    if config["beneficios"] is None:
        return BENEFICIOS_PLANO
    escolhidos = set(config["beneficios"])
    return [b for b in BENEFICIOS_PLANO if b["codigo"] in escolhidos]


def texto_destaque(rotulo_metrica: str) -> str:
    return f"{rotulo_metrica}: dentro do esperado"


def resolver_destaques(config: dict, candidatos: list[dict]) -> list[str]:
    if config["destaques"] is None:
        return [texto_destaque(c["rotulo"]) for c in candidatos[:DESTAQUES_AUTOMATICOS]]
    por_codigo = {c["codigo"]: c["rotulo"] for c in candidatos}
    escolhidos = [codigo for codigo in config["destaques"] if codigo in por_codigo][:MAX_DESTAQUES_HEALTH]
    return [texto_destaque(por_codigo[codigo]) for codigo in escolhidos]
