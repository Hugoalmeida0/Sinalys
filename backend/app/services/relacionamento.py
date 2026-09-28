"""Registros do time de CS: contatos, silenciamento de alertas, cancelamentos e recuperações."""

import logging
import uuid
from datetime import datetime, timedelta, timezone

from app.errors import EntidadeNaoEncontradaError, ErroApi, ErroValidacao, NaoEncontrado, SemPredicaoError
from app.models import contatos as contatos_model
from app.models import eventos as eventos_model
from app.models import projetos as projetos_model
from app.models import silenciamentos as silenciamentos_model
from app.services.constantes import (
    MAX_DIAS_SILENCIAMENTO,
    MOTIVOS_CANCELAMENTO,
    PADRAO_DIAS_SILENCIAMENTO,
    TIPOS_CONTATO,
    normalizar_tipo_contato,
)
from app.services.ia.contexto import resolver_entidade
from app.services.ia.indexar import indexar_caso_historico
from app.services.sessao import UsuarioSessao
from app.utils.formatacao import iso_js, parse_data

log = logging.getLogger("sinalys.relacionamento")


def _identificador(valor) -> str:
    if not isinstance(valor, str) or not valor.strip():
        raise ErroValidacao("Campo 'cliente_id' é obrigatório.")
    return valor.strip()


def _entidade_ou_404(projeto_id: str, identificador: str) -> dict:
    entidade = resolver_entidade(projeto_id, identificador)
    if not entidade:
        raise NaoEncontrado(f'Cliente "{identificador}" não encontrado.')
    return entidade


def _texto_opcional(valor) -> str | None:
    return valor.strip() if isinstance(valor, str) and valor.strip() else None


def registrar_contato(projeto_id: str, usuario: UsuarioSessao | None, dados: dict) -> dict:
    identificador = _identificador(dados.get("cliente_id") or dados.get("entidade_id"))
    tipo = normalizar_tipo_contato(dados.get("tipo"))
    if not tipo:
        raise ErroValidacao(f"Campo 'tipo' inválido. Use um de: {', '.join(TIPOS_CONTATO)}.")
    realizado_em = parse_data(dados.get("realizado_em") or dados.get("data"))
    if not realizado_em:
        raise ErroValidacao("Campo 'realizado_em' inválido (use ISO 8601).")
    resumo = dados.get("resumo")
    if not isinstance(resumo, str) or not resumo.strip():
        raise ErroValidacao("Campo 'resumo' é obrigatório.")
    proximo_passo_em = parse_data(dados["proximo_passo_em"]) if dados.get("proximo_passo_em") else None
    if dados.get("proximo_passo_em") and not proximo_passo_em:
        raise ErroValidacao("Campo 'proximo_passo_em' inválido (use ISO 8601).")

    try:
        entidade = _entidade_ou_404(projeto_id, identificador)
        contato = contatos_model.inserir(
            {
                "projeto_id": projeto_id,
                "entidade_id": entidade["id"],
                "tipo": tipo,
                "realizado_em": iso_js(realizado_em),
                "resumo": resumo.strip(),
                "proximo_passo": _texto_opcional(dados.get("proximo_passo")),
                "proximo_passo_em": iso_js(proximo_passo_em) if proximo_passo_em else None,
                "autor_usuario_id": usuario.id if usuario else None,
                "autor_nome": usuario.nome if usuario else None,
            }
        )
    except ErroApi:
        raise
    except Exception as erro:  # noqa: BLE001
        raise ErroApi(f"Falha ao registrar contato: {erro}") from erro
    return {"projeto_id": projeto_id, "cliente_id": entidade["id_externo"], "contato": contato}


def listar_contatos(projeto_id: str, identificador: str | None, limite_param: str | None) -> dict:
    try:
        limite = int(float(limite_param)) if limite_param else 50
    except ValueError:
        limite = 50
    limite = min(max(limite or 50, 1), 500)

    entidade_id = None
    if identificador:
        entidade_id = _entidade_ou_404(projeto_id, identificador)["id"]
    try:
        contatos = contatos_model.listar(projeto_id, limite, entidade_id)
    except Exception as erro:  # noqa: BLE001
        raise ErroApi(f"Falha ao listar contatos: {erro}") from erro
    return {"projeto_id": projeto_id, "contatos": contatos}


def silenciar_alertas(projeto_id: str, usuario: UsuarioSessao | None, dados: dict) -> dict:
    identificador = _identificador(dados.get("cliente_id") or dados.get("entidade_id"))
    bruto = dados.get("dias")
    try:
        dias = PADRAO_DIAS_SILENCIAMENTO if bruto is None else float(bruto)
    except (TypeError, ValueError):
        dias = float("nan")
    if dias != dias or not float(dias).is_integer() or dias < 1 or dias > MAX_DIAS_SILENCIAMENTO:
        raise ErroValidacao(f"Campo 'dias' deve ser um inteiro entre 1 e {MAX_DIAS_SILENCIAMENTO}.")

    entidade = _entidade_ou_404(projeto_id, identificador)
    try:
        silenciamento = silenciamentos_model.inserir(
            {
                "projeto_id": projeto_id,
                "entidade_id": entidade["id"],
                "silenciado_ate": iso_js(datetime.now(timezone.utc) + timedelta(days=int(dias))),
                "motivo": _texto_opcional(dados.get("motivo")),
                "autor_usuario_id": usuario.id if usuario else None,
            }
        )
    except Exception as erro:  # noqa: BLE001
        raise ErroApi(f"Falha ao silenciar alertas: {erro}") from erro
    return {"projeto_id": projeto_id, "cliente_id": entidade["id_externo"], "silenciamento": silenciamento}


def reativar_alertas(projeto_id: str, dados: dict) -> dict:
    identificador = _identificador(dados.get("cliente_id") or dados.get("entidade_id"))
    entidade = _entidade_ou_404(projeto_id, identificador)
    try:
        encerrados = silenciamentos_model.encerrar_vigentes(projeto_id, entidade["id"], iso_js(datetime.now(timezone.utc)))
    except Exception as erro:  # noqa: BLE001
        raise ErroApi(f"Falha ao reativar alertas: {erro}") from erro
    return {"projeto_id": projeto_id, "cliente_id": entidade["id_externo"], "encerrados": encerrados}


def registrar_cancelamento(projeto_id: str, dados: dict) -> dict:
    identificador = dados.get("cliente_id") or dados.get("entidade_id")
    if not isinstance(identificador, str) or not identificador:
        raise ErroValidacao("Campo 'cliente_id' é obrigatório (UUID da entidade ou id_externo).")
    categoria = dados.get("motivo_categoria")
    if categoria not in MOTIVOS_CANCELAMENTO:
        raise ErroValidacao(
            f"Campo 'motivo_categoria' é obrigatório e deve ser um de: {', '.join(MOTIVOS_CANCELAMENTO)}."
        )

    entidade = resolver_entidade(projeto_id, identificador)
    if not entidade:
        raise EntidadeNaoEncontradaError(f'Nenhuma entidade com identificador "{identificador}" no projeto {projeto_id}.')

    try:
        projeto = projetos_model.buscar_codigo_evento_alvo(projeto_id)
        if not projeto:
            raise RuntimeError(f"Projeto {projeto_id} não encontrado.")
        evento_id = str(uuid.uuid4())
        eventos_model.inserir(
            {
                "id": evento_id,
                "projeto_id": projeto_id,
                "entidade_id": entidade["id"],
                "codigo_evento": projeto["codigo_evento_alvo"],
                "ocorrido_em": iso_js(datetime.now(timezone.utc)),
                "motivo_categoria": categoria,
                "motivo_detalhe": _texto_opcional(dados.get("motivo_detalhe")),
            }
        )
    except Exception as erro:  # noqa: BLE001
        raise ErroApi(f"Falha ao registrar cancelamento: {erro}") from erro

    # O que foi tentado antes do cancelamento vira memória para a IA não repetir a recomendação.
    indexado = False
    acao = dados.get("acao_realizada")
    if isinstance(acao, str) and acao.strip():
        try:
            indexar_caso_historico(projeto_id, identificador, acao.strip(), "cancelado", evento_desfecho_id=evento_id)
            indexado = True
        except Exception as erro:  # noqa: BLE001 - indexação é complementar ao registro
            log.warning("Cancelamento registrado, mas não indexado no histórico: %s", erro)

    return {"projeto_id": projeto_id, "evento_desfecho_id": evento_id, "indexado_no_historico": indexado}


def registrar_feedback(projeto_id: str, dados: dict) -> dict:
    """Desfecho informado pelo time (recuperado/cancelado) vira caso na memória vetorial."""
    identificador = dados.get("cliente_id") or dados.get("entidade_id")
    acao = dados.get("acao_realizada")
    desfecho = dados.get("desfecho")
    if not isinstance(identificador, str) or not identificador:
        raise ErroValidacao("Campo 'cliente_id' é obrigatório (UUID da entidade ou id_externo).")
    if not isinstance(acao, str) or not acao.strip():
        raise ErroValidacao("Campo 'acao_realizada' é obrigatório.")
    if desfecho not in ("recuperado", "cancelado"):
        raise ErroValidacao("Campo 'desfecho' deve ser 'recuperado' ou 'cancelado'.")

    try:
        resultado = indexar_caso_historico(
            projeto_id,
            identificador,
            acao.strip(),
            desfecho,
            evento_desfecho_id=dados.get("evento_desfecho_id"),
            contexto_texto_manual=dados.get("contexto_texto"),
            modelo_id=dados.get("modelo_id"),
        )
    except SemPredicaoError as erro:
        raise SemPredicaoError(
            f"{erro.mensagem} Alternativamente, envie 'contexto_texto' para indexar um caso anterior à adoção do sistema."
        ) from erro
    except ErroApi:
        raise
    except Exception as erro:  # noqa: BLE001
        raise ErroApi(f"Falha ao registrar feedback: {erro}") from erro
    return {"projeto_id": projeto_id, **resultado}
