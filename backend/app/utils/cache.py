import threading
import time
from collections.abc import Callable
from functools import wraps
from typing import Any


def cache_ttl(segundos: float) -> Callable:
    """Memoriza o retorno por argumentos durante ``segundos`` (o ``unstable_cache`` do Next)."""

    def decorador(funcao: Callable) -> Callable:
        entradas: dict[tuple, tuple[float, Any]] = {}
        trava = threading.Lock()

        @wraps(funcao)
        def envoltorio(*args: Any) -> Any:
            agora = time.monotonic()
            with trava:
                achado = entradas.get(args)
                if achado and achado[0] > agora:
                    return achado[1]
            valor = funcao(*args)
            with trava:
                entradas[args] = (agora + segundos, valor)
            return valor

        envoltorio.limpar = entradas.clear  # type: ignore[attr-defined]
        return envoltorio

    return decorador
