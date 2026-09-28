# Sinalys

Plataforma de Customer Success que antecipa o cancelamento de clientes (churn). A Sinalys lê os indicadores de cada cliente (uso, pagamentos, SLA, NPS…), calcula um **score de risco de 0 a 100**, ordena a carteira por prioridade — risco combinado com o peso financeiro da conta — e mostra ao analista **quem contatar hoje, por quê e o que fazer**, com apoio de uma IA que compara o caso com clientes parecidos do histórico da própria empresa. Projeto criado no hackathon Desafio InovaApps.

## Arquitetura

```
frontend/  React + Vite  ──/api──▶  backend/  Python + FastAPI  ──▶  Supabase (PostgreSQL + pgvector)
                                              │
                                              ├─▶ OpenRouter (LLM)
                                              └─▶ Gemini (embeddings)
```

- **Motor determinístico calcula o score.** Cada indicador é comparado com a carteira (z-score) ou com o histórico do próprio cliente (média móvel), ponderado pelos pesos do modelo e consolidado num score 0–100 com faixa (crítico, alerta, atenção, saudável). Mesmos dados, mesmo resultado. Cada score guarda os motivos que o explicam. É um índice operacional, ainda sem validação estatística — não é probabilidade.
- **A IA assiste, não decide.** A LLM recebe os fatos já calculados, busca casos históricos semelhantes (pgvector) e sugere diagnóstico e plano de ação. É somente leitura: não acessa o banco e não altera o score. Se ela falhar, um diagnóstico de contingência é montado só com regras.
- **Exposição** é o valor em reais associado ao score (`MRR × 12 × score/100`): quanto da receita está sob risco, não uma previsão de perda.
- O backend segue MVC: `routes` → `controllers` → `services` (motor, IA, fallback) → `models` (Supabase), com `schemas` Pydantic como view. Detalhes em [`docs/`](docs/).

## Como rodar localmente

Requisitos: Python 3.11+, Node.js 20+ e um projeto Supabase com o schema aplicado (rode [`backend/db/modelagem.sql`](backend/db/modelagem.sql) e depois [`backend/db/rls.sql`](backend/db/rls.sql) no SQL Editor, e crie um usuário em Authentication).

**Backend** (API em http://localhost:8000, documentação em `/docs`):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # preencha as variáveis abaixo
uvicorn main:app --reload --port 8000
```

**Frontend** (em outro terminal; abre em http://localhost:5173):

```bash
cd frontend
npm install
npm run dev
```

Testes: `pip install -r requirements-dev.txt && pytest` no backend; `npm run typecheck` no frontend.

## Variáveis de ambiente

Os modelos estão em [`backend/.env.example`](backend/.env.example) e [`frontend/.env.example`](frontend/.env.example). Nenhum valor real vai para o repositório.

**backend/.env**

| Variável | O que é e onde obter |
| --- | --- |
| `SUPABASE_URL` | URL do projeto Supabase — painel do Supabase > Project Settings > API (Project URL). |
| `SUPABASE_ANON_KEY` | Chave pública (anon), usada no login — Project Settings > API. |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço, só no servidor (ignora RLS) — Project Settings > API (service_role). Nunca a exponha no frontend. |
| `DEFAULT_PROJETO_ID` | UUID do projeto usado quando o usuário não tem `app_metadata.projeto_id` — coluna `id` da tabela `projetos` (Table Editor). |
| `SUPABASE_STORAGE_BUCKET_INGESTAO` | Bucket privado dos arquivos de ingestão (padrão `ingestao-raw`) — crie em Storage no painel do Supabase. |
| `OPENROUTER_API_KEY` | Chave da LLM — openrouter.ai/keys. |
| `OPENROUTER_MODELO_LLM` | Modelo do diagnóstico — escolha um ID em openrouter.ai/models (padrão já preenchido). |
| `OPENROUTER_MODELO_CHAT` | Modelo do assistente; precisa suportar *tool calling* — openrouter.ai/models. |
| `GEMINI_API_KEY` | Chave dos embeddings — Google AI Studio > API Keys (aistudio.google.com/apikey). |
| `GEMINI_MODELO_EMBEDDING` | Modelo de embedding (padrão `gemini-embedding-001`). |
| `APP_URL` | Endereço do frontend (padrão `http://localhost:5173`). |
| `CORS_ORIGINS` | Origens liberadas para chamar a API, separadas por vírgula. |
| `COOKIE_SECURE` | `true` quando a API estiver atrás de HTTPS (cookie de sessão seguro). |

**frontend/.env** (opcional)

| Variável | O que é e onde obter |
| --- | --- |
| `VITE_API_URL` | Endereço da API para onde o Vite encaminha `/api` (padrão `http://localhost:8000`). |
