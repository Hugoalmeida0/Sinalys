"""Erros de domínio. Cada um carrega o status HTTP que a API devolve.

A resposta de erro mantém o contrato da API original: ``{"erro": "mensagem"}``.
"""


class ErroApi(Exception):
    status = 500

    def __init__(self, mensagem: str, status: int | None = None):
        super().__init__(mensagem)
        self.mensagem = mensagem
        if status is not None:
            self.status = status


class ErroValidacao(ErroApi):
    status = 400


class NaoAutenticado(ErroApi):
    status = 401


class NaoEncontrado(ErroApi):
    status = 404


class Conflito(ErroApi):
    status = 409


class NaoProcessavel(ErroApi):
    """422: a requisição é válida, mas falta um pré-requisito (modelo ativo, predição...)."""

    status = 422


class ErroConfiguracao(ErroApi):
    status = 500


# Nomes do domínio original, usados pelos serviços de IA.
class EntidadeNaoEncontradaError(NaoEncontrado):
    pass


class SemPredicaoError(NaoProcessavel):
    pass


class RegraInvalidaError(ErroValidacao):
    pass


class SemModeloAtivoError(NaoProcessavel):
    pass
