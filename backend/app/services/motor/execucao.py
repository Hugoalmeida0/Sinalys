"""Casos de uso do motor expostos pela API."""

import math
from dataclasses import asdict

from app.errors import ErroApi, ErroValidacao, SemModeloAtivoError
from app.models import modelos as modelos_model
from app.services.motor import modelo as modelo_service
from app.services.motor.calcular import calcular_predicoes_projeto
from app.utils.formatacao import iso_js, parse_data
from app.utils.numeros import eh_numero


def executar_calculo(projeto_id: str, dados: dict) -> dict:
    referencia = None
    if dados.get("referencia_em"):
        referencia = parse_data(str(dados["referencia_em"]))
        if referencia is None:
            raise ErroValidacao("referencia_em inválido (use ISO 8601).")

    modelo_id = dados.get("modelo_id")
    if not modelo_id:
        modelo = modelos_model.buscar_modelo_ativo(projeto_id)
        if not modelo:
            raise SemModeloAtivoError(
                "Nenhum modelo ativo encontrado para o projeto. Informe 'modelo_id' explicitamente ou ative um "
                "modelo (status='ativo') em regras_modelo."
            )
        modelo_id = modelo["id"]

    try:
        resultado = calcular_predicoes_projeto(projeto_id, modelo_id, referencia)
    except Exception as erro:  # noqa: BLE001
        raise ErroApi(f"Falha ao calcular predições: {erro}") from erro

    return {
        "projeto_id": projeto_id,
        "modelo_id": modelo_id,
        "referencia_em": iso_js(resultado.referencia_em),
        "total_entidades": len(resultado.predicoes),
        "predicoes": [asdict(p) for p in resultado.predicoes],
        "avisos": resultado.avisos,
    }


def obter_modelo(projeto_id: str) -> dict:
    detalhe = modelo_service.carregar_modelo_ativo_detalhado(projeto_id)
    if not detalhe:
        raise SemModeloAtivoError("Nenhum modelo ativo encontrado para este projeto.")
    return detalhe


def atualizar_pesos(projeto_id: str, dados: dict) -> dict:
    atualizacoes = dados.get("atualizacoes")
    if not isinstance(atualizacoes, list) or not atualizacoes:
        raise ErroValidacao("Campo 'atualizacoes' é obrigatório e não pode ser vazio.")
    for a in atualizacoes:
        if not isinstance(a, dict) or not isinstance(a.get("id"), str) or not eh_numero(a.get("peso")):
            raise ErroValidacao("Cada item de 'atualizacoes' precisa de 'id' (string) e 'peso' (número).")

    modelo_id = modelo_service.exigir_modelo_ativo(projeto_id)
    modelo_service.atualizar_pesos(projeto_id, modelo_id, [{"id": a["id"], "peso": a["peso"]} for a in atualizacoes])
    return modelo_service.recalcular_e_devolver_modelo(projeto_id, modelo_id)


def criar_regra(projeto_id: str, dados: dict) -> dict:
    metrica_id = dados.get("metrica_id")
    if not isinstance(metrica_id, str) or not metrica_id:
        raise ErroValidacao("Campo 'metrica_id' é obrigatório.")
    if not isinstance(dados.get("tipo"), str) or not isinstance(dados.get("direcao"), str) or not eh_numero(dados.get("peso")):
        raise ErroValidacao("Campos 'tipo' (string), 'direcao' (string) e 'peso' (número) são obrigatórios.")

    def opcional(chave: str) -> float | None:
        # Mantém int como int: o valor vai para o JSON de config_regra como veio.
        valor = dados.get(chave)
        return valor if eh_numero(valor) and math.isfinite(valor) else None

    modelo_id = modelo_service.exigir_modelo_ativo(projeto_id)
    modelo_service.criar_regra(
        projeto_id,
        modelo_id,
        metrica_id,
        dados["tipo"],
        dados["direcao"],
        dados["peso"],
        janela_dias=opcional("janela_dias"),
        janela_observacoes=opcional("janela_observacoes"),
        pontuacao_omissao=opcional("pontuacao_omissao"),
    )
    return modelo_service.recalcular_e_devolver_modelo(projeto_id, modelo_id)

