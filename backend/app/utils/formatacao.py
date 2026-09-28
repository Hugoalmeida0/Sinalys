"""Formatação pt-BR usada em textos gerados no backend (prompts, sinais, resumos)."""

from datetime import date, datetime, timezone
from decimal import ROUND_HALF_UP, Decimal
from zoneinfo import ZoneInfo

FUSO_BRASIL = ZoneInfo("America/Sao_Paulo")

# Intl.NumberFormat pt-BR separa "R$" do valor com espaço não quebrável.
NBSP = " "

MESES_LONGOS = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]


def formatar_numero_ptbr(valor: float, max_casas: int = 3, min_casas: int = 0) -> str:
    """Equivalente a ``valor.toLocaleString("pt-BR", {maximumFractionDigits, minimumFractionDigits})``."""
    quantum = Decimal(1).scaleb(-max_casas)
    d = Decimal(valor).quantize(quantum, rounding=ROUND_HALF_UP)
    negativo = d < 0
    inteiro, _, frac = f"{abs(d):f}".partition(".")
    frac = frac.rstrip("0")
    if len(frac) < min_casas:
        frac = frac.ljust(min_casas, "0")
    grupos = f"{int(inteiro):,}".replace(",", ".")
    texto = f"{grupos},{frac}" if frac else grupos
    return f"-{texto}" if negativo and texto.strip("0.,") else texto


def formatar_moeda_brl(valor: float, casas: int = 2) -> str:
    """Equivalente a ``toLocaleString("pt-BR", {style: "currency", currency: "BRL"})``."""
    negativo = valor < 0
    texto = formatar_numero_ptbr(abs(valor), max_casas=casas, min_casas=casas)
    return f"-R${NBSP}{texto}" if negativo else f"R${NBSP}{texto}"


def formatar_moeda_brl_compacta(valor: float) -> str:
    """Espelha ``formatCurrencyBRL`` do frontend: milhões viram "R$ 1,2 mi"."""
    if valor >= 1_000_000:
        return f"R$ {formatar_numero_ptbr(valor / 1_000_000, max_casas=1, min_casas=1)} mi"
    return formatar_moeda_brl(valor, casas=0)


def iso_js(momento: datetime) -> str:
    """Equivalente a ``Date.prototype.toISOString`` (UTC, milissegundos, sufixo Z)."""
    utc = momento.astimezone(timezone.utc)
    return utc.strftime("%Y-%m-%dT%H:%M:%S.") + f"{utc.microsecond // 1000:03d}Z"


def parse_data(texto: str) -> datetime | None:
    """Lê uma data ISO 8601. Data sem hora vira meia-noite UTC, como faz ``new Date("2026-01-31")``."""
    if not isinstance(texto, str) or not texto.strip():
        return None
    bruto = texto.strip()
    try:
        if len(bruto) == 10:
            d = date.fromisoformat(bruto)
            return datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
        momento = datetime.fromisoformat(bruto.replace("Z", "+00:00"))
    except ValueError:
        return None
    if momento.tzinfo is None:
        # Data e hora sem fuso: o JS interpreta no fuso local do navegador. No
        # servidor o equivalente é o fuso de operação do produto.
        momento = momento.replace(tzinfo=FUSO_BRASIL)
    return momento


def data_extenso_ptbr(momento: datetime) -> str:
    """``toLocaleDateString("pt-BR", {day: "2-digit", month: "long", year: "numeric"})``."""
    return f"{momento.day:02d} de {MESES_LONGOS[momento.month - 1]} de {momento.year}"


def tempo_desde(iso: str, agora: datetime | None = None) -> str:
    """Espelha ``tempoDesde``: "2 anos e 3 meses", "5 meses"."""
    inicio = parse_data(iso[:10] if len(iso) >= 10 else iso)
    if inicio is None:
        return ""
    agora = agora or datetime.now(FUSO_BRASIL)
    meses = (agora.year - inicio.year) * 12 + (agora.month - inicio.month)
    if agora.day < inicio.day:
        meses -= 1
    anos, restantes = divmod(meses, 12)
    partes: list[str] = []
    if anos > 0:
        partes.append(f"{anos} ano{'s' if anos > 1 else ''}")
    if restantes > 0 or anos == 0:
        partes.append(f"{restantes} {'mês' if restantes == 1 else 'meses'}")
    return " e ".join(partes)
