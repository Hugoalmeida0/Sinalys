"""Contrato da saída estruturada da LLM. Resposta fora dele aciona o fallback por regras."""

from pydantic import BaseModel, Field, StringConstraints
from typing_extensions import Annotated

TextoNaoVazio = Annotated[str, StringConstraints(min_length=1)]


class Diagnostico(BaseModel):
    diagnostico_principal: TextoNaoVazio = Field(
        description="Descrição breve e direta do principal ofensor do risco, citando o sinal concreto que o sustenta."
    )
    analise_lookalike: TextoNaoVazio = Field(
        description=(
            "Comparação com os casos históricos similares fornecidos. Se nenhum caso foi fornecido, declarar "
            "explicitamente que não há histórico comparável na base."
        )
    )
    plano_acao_imediato: list[TextoNaoVazio] = Field(
        min_length=1,
        max_length=5,
        description=(
            "Ações prescritivas, específicas e executáveis pelo analista de CS nos próximos dias. Sem conselhos "
            "genéricos. Cada item é o texto puro da ação: NÃO prefixar com número, marcador ou '1.', pois a "
            "numeração é feita por quem exibe a lista."
        ),
    )


def json_schema_diagnostico() -> dict:
    schema = Diagnostico.model_json_schema()
    schema["additionalProperties"] = False
    return schema
