CODIGO_METRICA_RECEITA_MENSAL = "receita_mensal"

PADRAO_JANELA_MEDIA_MOVEL_DIAS = 30

PADRAO_JANELA_OBSERVACOES = 3

# Sem configuração explícita, ausência de dado não pontua: a regra fica
# "não avaliável" e só reduz a cobertura da predição.
OMISSAO_SEM_PONTUACAO = None

PADRAO_CLIP_Z = 3

# Um motivo só vira evidência ("acionado") a partir de 1 desvio-padrão.
LIMIAR_Z_ACIONADO = 1

TIPOS_REGRA = ("zscore_carteira", "media_movel")
DIRECOES = ("maior_pior", "menor_pior")
