"""Memória de casos: transforma um desfecho (ação tomada + resultado) em vetor pesquisável."""

import uuid

from app.errors import EntidadeNaoEncontradaError
from app.models import casos_historicos as casos_model
from app.services.ia.contexto import montar_contexto_atual, resolver_entidade
from app.services.ia.descricao import descrever_caso_historico, descrever_perfil_risco
from app.services.ia.embeddings import gerar_embedding, obter_modelo_embedding


def indexar_caso_historico(
    projeto_id: str,
    identificador_entidade: str,
    acao_realizada: str,
    desfecho: str,
    evento_desfecho_id: str | None = None,
    contexto_texto_manual: str | None = None,
    modelo_id: str | None = None,
) -> dict:
    entidade = resolver_entidade(projeto_id, identificador_entidade)
    if not entidade:
        raise EntidadeNaoEncontradaError(
            f'Nenhuma entidade com identificador "{identificador_entidade}" no projeto {projeto_id}.'
        )

    if contexto_texto_manual and contexto_texto_manual.strip():
        perfil_risco = contexto_texto_manual.strip()
    else:
        perfil_risco = descrever_perfil_risco(montar_contexto_atual(projeto_id, entidade, modelo_id))

    contexto_texto = descrever_caso_historico(perfil_risco, acao_realizada, desfecho)
    embedding = gerar_embedding(contexto_texto)

    caso_id = str(uuid.uuid4())
    casos_model.inserir(
        {
            "id": caso_id,
            "projeto_id": projeto_id,
            "entidade_id": entidade["id"],
            "evento_desfecho_id": evento_desfecho_id,
            "contexto_texto": contexto_texto,
            "acao_realizada": acao_realizada,
            "desfecho": desfecho,
            "embedding": embedding,
        }
    )
    return {
        "caso_id": caso_id,
        "entidade_id": entidade["id"],
        "contexto_texto": contexto_texto,
        "desfecho": desfecho,
        "modelo_embedding": obter_modelo_embedding(),
    }
