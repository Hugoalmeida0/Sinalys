"""Vocabulário fechado do domínio (contatos, cancelamento, pedidos de call)."""

TIPOS_CONTATO = {
    "ligacao": "Ligação",
    "reuniao_presencial": "Reunião presencial",
    "videochamada": "Videochamada",
    "email": "E-mail",
    "whatsapp": "WhatsApp",
    "outro": "Outro",
}

PADRAO_DIAS_SILENCIAMENTO = 30
MAX_DIAS_SILENCIAMENTO = 365

MOTIVOS_CANCELAMENTO = {
    "preco": "Preço",
    "suporte": "Suporte",
    "produto": "Produto",
    "concorrencia": "Concorrência",
    "financeiro": "Financeiro do cliente",
    "outro": "Outro",
}

PREFIXO_SOLICITACAO_AGENDAMENTO = "[Health Score] "
MAX_TAMANHO_NOME_SOLICITANTE = 120
MAX_TAMANHO_MENSAGEM_SOLICITACAO = 600
PROXIMO_PASSO_AGENDAMENTO = "Agendar reunião de alinhamento"


def normalizar_tipo_contato(valor) -> str | None:
    """Aceita o código (``ligacao``) ou o rótulo (``Ligação``)."""
    if not isinstance(valor, str):
        return None
    v = valor.strip()
    if v in TIPOS_CONTATO:
        return v
    for codigo, rotulo in TIPOS_CONTATO.items():
        if rotulo.lower() == v.lower():
            return codigo
    return None
