from typing import Any

from pydantic import BaseModel, ConfigDict


class Entrada(BaseModel):
    """Corpo de requisição tolerante: aceita campos extras e deixa a validação de negócio para o serviço.

    Os serviços devolvem as mesmas mensagens de erro da API original; por isso o
    schema só descreve os campos e o controller repassa ``dados()``.
    """

    model_config = ConfigDict(extra="allow")

    def dados(self) -> dict[str, Any]:
        """Somente os campos enviados — "ausente" e "null" têm significados diferentes em alguns recursos."""
        return self.model_dump(exclude_unset=True)


class Saida(BaseModel):
    model_config = ConfigDict(extra="ignore")


class Erro(Saida):
    erro: str
