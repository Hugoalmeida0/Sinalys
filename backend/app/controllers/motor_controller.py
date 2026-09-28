from app.controllers.sessao import Contexto, projeto_do_corpo
from app.schemas.motor import AtualizarPesosEntrada, CalcularEntrada, NovaRegraEntrada
from app.services.motor import execucao
from app.services.painel import consultas


def calcular(contexto: Contexto, corpo: CalcularEntrada | None) -> dict:
    dados = corpo.dados() if corpo else {}
    return execucao.executar_calculo(projeto_do_corpo(contexto, dados), dados)


def fila_urgencia(contexto: Contexto, modelo_id: str | None) -> dict:
    return consultas.fila_urgencia_legada(contexto.projeto_id, consultas.resolver_modelo(contexto.projeto_id, modelo_id))


def obter_modelo(contexto: Contexto) -> dict:
    return execucao.obter_modelo(contexto.projeto_id)


def atualizar_pesos(contexto: Contexto, corpo: AtualizarPesosEntrada | None) -> dict:
    dados = corpo.dados() if corpo else {}
    return execucao.atualizar_pesos(projeto_do_corpo(contexto, dados), dados)


def criar_regra(contexto: Contexto, corpo: NovaRegraEntrada | None) -> dict:
    dados = corpo.dados() if corpo else {}
    return execucao.criar_regra(projeto_do_corpo(contexto, dados), dados)
