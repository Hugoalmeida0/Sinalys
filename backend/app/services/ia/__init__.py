"""Camada de IA assistente.

A LLM (OpenRouter) só lê: recebe os fatos já calculados pelo motor
determinístico e os casos históricos semelhantes (pgvector) e devolve
diagnóstico e plano de ação. Ela não tem acesso ao banco e não altera o score.
Quando a LLM falha, ``fallback.py`` monta o diagnóstico só com regras.
"""
