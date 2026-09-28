"""Motor de score determinístico.

O score 0–100 sai daqui, e só daqui: normalização dos sinais (z-score contra a
carteira ou média móvel contra o próprio histórico), média ponderada pelos
pesos do modelo e faixa de risco. A LLM nunca calcula nem altera esse número.
"""
