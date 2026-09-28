"""Aritmética com a mesma semântica do frontend (JavaScript).

O motor foi escrito em TypeScript e o frontend continua exibindo os números;
para o score calculado aqui bater casa a casa com o que a interface projeta,
arredondamentos seguem as regras do JS em vez das do Python:

- ``Math.round`` arredonda .5 para cima (o ``round`` do Python é bancário);
- ``Number.prototype.toFixed`` arredonda a partir do valor binário exato,
  metade para longe do zero.
"""

import math
from decimal import ROUND_HALF_UP, Decimal
from typing import Any


def js_round(valor: float) -> int:
    """Equivalente a ``Math.round``."""
    return math.floor(valor + 0.5)


def to_fixed(valor: float, casas: int) -> str:
    """Equivalente a ``Number.prototype.toFixed``."""
    quantum = Decimal(1).scaleb(-casas)
    return str(Decimal(valor).quantize(quantum, rounding=ROUND_HALF_UP))


def arredondar(valor: float, casas: int) -> float:
    """Equivalente a ``Number(valor.toFixed(casas))``."""
    return float(to_fixed(valor, casas))


def numero(valor: Any) -> float | None:
    """Converte o que vem do banco (numeric chega como número ou texto) em float."""
    if valor is None or isinstance(valor, bool):
        return None
    try:
        n = float(valor)
    except (TypeError, ValueError):
        return None
    return n if math.isfinite(n) else None


def eh_numero(valor: Any) -> bool:
    """``typeof valor === "number"`` — booleano não conta."""
    return isinstance(valor, (int, float)) and not isinstance(valor, bool)


def js_str(valor: Any) -> str:
    """Como o JS interpola um número numa template string (``12`` e não ``12.0``)."""
    if isinstance(valor, bool):
        return "true" if valor else "false"
    if isinstance(valor, float):
        if math.isfinite(valor) and valor.is_integer():
            return str(int(valor))
        return repr(valor)
    if valor is None:
        return "null"
    return str(valor)
