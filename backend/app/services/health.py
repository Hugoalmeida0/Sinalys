"""Health Score compartilhável: página pública (sem score, faixa ou MRR) e pedidos de call."""

import re
from datetime import datetime, timezone

from app.errors import ErroApi, ErroValidacao, NaoEncontrado, SemPredicaoError
from app.models import contatos as contatos_model
from app.models import entidades as entidades_model
from app.models import modelos as modelos_model
from app.services.constantes import (
    MAX_TAMANHO_MENSAGEM_SOLICITACAO,
    MAX_TAMANHO_NOME_SOLICITANTE,
    PREFIXO_SOLICITACAO_AGENDAMENTO,
    PROXIMO_PASSO_AGENDAMENTO,
)
from app.services.health_config import (
    BENEFICIOS_PLANO,
    CHAVE_ATRIBUTO_HEALTH_PUBLICO,
    MAX_DESTAQUES_HEALTH,
    ler_config_health_publico,
    resolver_beneficios,
    resolver_destaques,
    serializar_config_health_publico,
    validar_link_agendamento,
)
from app.services.ia.contexto import montar_contexto_atual, resolver_entidade
from app.utils.formatacao import FUSO_BRASIL, iso_js, parse_data, tempo_desde

DESTAQUE_PADRAO = "Sua conta está em dia com o que a gente acompanha por aqui."
REGEX_EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
MAX_TAMANHO_CODIGO = 120


def buscar_health_publico(token: str) -> dict:
    entidade = entidades_model.buscar_por_token(token)
    if not entidade:
        raise NaoEncontrado("Página não encontrada.")

    nome = entidade.get("nome_exibicao") or entidade["id_externo"]
    cliente_desde = tempo_desde(str(entidade["iniciado_em"])) if entidade.get("iniciado_em") else None
    config = ler_config_health_publico(entidade.get("atributos"))

    # Só sinais DENTRO do padrão viram destaque: a página nunca expõe risco.
    candidatos: list[dict] = []
    modelo_id = modelos_model.id_modelo_ativo(entidade["projeto_id"])
    if modelo_id:
        try:
            contexto = montar_contexto_atual(entidade["projeto_id"], entidade, modelo_id)
            candidatos = [{"codigo": s.codigo_sinal, "rotulo": s.metrica} for s in contexto.sinais if s.acionado is False]
        except SemPredicaoError:
            candidatos = []

    destaques = resolver_destaques(config, candidatos)
    return {
        "nome": nome,
        "clienteDesdeTexto": cliente_desde,
        "destaques": destaques or [DESTAQUE_PADRAO],
        "beneficios": [b["texto"] for b in resolver_beneficios(config)],
        "linkAgendamento": config["linkAgendamento"],
    }


def _texto(valor, maximo: int) -> str | None:
    if not isinstance(valor, str):
        return None
    t = valor.strip()
    return t[:maximo] if t else None


def montar_resumo_solicitacao(nome: str, email: str | None, preferencia_em: str | None, mensagem: str | None) -> str:
    quem = f"{nome} ({email})" if email else nome
    quando = ""
    if preferencia_em:
        local = datetime.fromisoformat(preferencia_em.replace("Z", "+00:00")).astimezone(FUSO_BRASIL)
        quando = f" Preferência de horário: {local.strftime('%d/%m/%Y, %H:%M')}."
    obs = f' Mensagem do cliente: "{mensagem}"' if mensagem else ""
    return f"{PREFIXO_SOLICITACAO_AGENDAMENTO}{quem} pediu uma call de alinhamento pela página de Health Score.{quando}{obs}"


def registrar_pedido_de_call(dados: dict) -> dict:
    # Campo-isca: formulário preenchido por robô é aceito e descartado.
    if isinstance(dados.get("site"), str) and dados["site"].strip():
        return {"ok": True}

    token = dados.get("token")
    if not isinstance(token, str) or not token.strip():
        raise ErroValidacao("Token da página é obrigatório.")
    nome = _texto(dados.get("nome"), MAX_TAMANHO_NOME_SOLICITANTE)
    if not nome:
        raise ErroValidacao("Informe seu nome para a gente te chamar.")
    email = _texto(dados.get("email"), 200)
    if email and not REGEX_EMAIL.match(email):
        raise ErroValidacao("E-mail inválido.")
    preferencia_em = None
    if dados.get("preferencia_em"):
        momento = parse_data(str(dados["preferencia_em"]))
        if not momento:
            raise ErroValidacao("Data/hora preferida inválida.")
        preferencia_em = iso_js(momento)
    mensagem = _texto(dados.get("mensagem"), MAX_TAMANHO_MENSAGEM_SOLICITACAO)

    entidade = entidades_model.buscar_por_token(token.strip())
    if not entidade:
        raise NaoEncontrado("Página não encontrada.")
    try:
        contatos_model.inserir(
            {
                "projeto_id": entidade["projeto_id"],
                "entidade_id": entidade["id"],
                "tipo": "outro",
                "realizado_em": iso_js(datetime.now(timezone.utc)),
                "resumo": montar_resumo_solicitacao(nome, email, preferencia_em, mensagem),
                "proximo_passo": PROXIMO_PASSO_AGENDAMENTO,
                "proximo_passo_em": preferencia_em,
                "autor_usuario_id": None,
                "autor_nome": None,
            }
        )
    except Exception as erro:  # noqa: BLE001
        raise ErroApi(f"Não foi possível registrar o pedido: {erro}") from erro
    return {"ok": True}


def _lista_de_codigos(valor, campo: str, maximo: int, presente: bool) -> tuple[bool, list[str] | None]:
    """Devolve ``(informado, lista)``. Campo ausente mantém o valor salvo; ``null`` volta ao automático."""
    if not presente:
        return False, None
    if valor is None:
        return True, None
    if not isinstance(valor, list) or not all(isinstance(v, str) for v in valor):
        raise ErroValidacao(f"Campo '{campo}' deve ser uma lista de códigos ou null.")
    lista = list(dict.fromkeys(v.strip() for v in valor if v.strip() and len(v.strip()) <= MAX_TAMANHO_CODIGO))
    if len(lista) > maximo:
        raise ErroValidacao(f"Campo '{campo}' aceita no máximo {maximo} itens.")
    return True, lista


def salvar_configuracao(projeto_id: str, dados: dict) -> dict:
    identificador = dados.get("cliente_id") or dados.get("entidade_id")
    if not isinstance(identificador, str) or not identificador.strip():
        raise ErroValidacao("Campo 'cliente_id' é obrigatório.")

    destaques_informados, destaques = _lista_de_codigos(
        dados.get("destaques"), "destaques", MAX_DESTAQUES_HEALTH, "destaques" in dados
    )
    beneficios_informados, beneficios = _lista_de_codigos(
        dados.get("beneficios"), "beneficios", len(BENEFICIOS_PLANO), "beneficios" in dados
    )
    if beneficios:
        conhecidos = {b["codigo"] for b in BENEFICIOS_PLANO}
        desconhecido = next((c for c in beneficios if c not in conhecidos), None)
        if desconhecido:
            raise ErroValidacao(f'Benefício desconhecido: "{desconhecido}".')

    link_informado = "link_agendamento" in dados
    link = None
    if link_informado:
        link, erro_link = validar_link_agendamento(dados["link_agendamento"])
        if erro_link:
            raise ErroValidacao(erro_link)

    entidade = resolver_entidade(projeto_id, identificador.strip())
    if not entidade:
        raise NaoEncontrado(f'Cliente "{identificador}" não encontrado.')

    try:
        atributos = entidades_model.buscar_atributos(entidade["id"])
        anterior = ler_config_health_publico(atributos)
        config = {
            "destaques": destaques if destaques_informados else anterior["destaques"],
            "beneficios": beneficios if beneficios_informados else anterior["beneficios"],
            "linkAgendamento": link if link_informado else anterior["linkAgendamento"],
            "atualizadoEm": iso_js(datetime.now(timezone.utc)),
        }
        entidades_model.atualizar_atributos(
            entidade["id"], {**atributos, CHAVE_ATRIBUTO_HEALTH_PUBLICO: serializar_config_health_publico(config)}
        )
    except Exception as erro:  # noqa: BLE001
        raise ErroApi(f"Falha ao salvar personalização: {erro}") from erro
    return {"projeto_id": projeto_id, "cliente_id": entidade["id_externo"], "configuracao": config}
