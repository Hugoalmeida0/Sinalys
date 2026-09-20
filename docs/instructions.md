
```markdown
# 📖 Instruções de Arquitetura e Fluxo da API (MVP Prevenção de Churn)

## 🎯 Objetivo
Desenvolver o backend unificado do MVP de prevenção de churn utilizando Next.js (App Router), projetado para deploy serverless na Vercel a custo zero. O sistema orquestra a coleta de dados de engajamento, realiza busca semântica em histórico de cancelamentos (RAG) e gera planos de ação utilizando IA generativa.

## 🛠️ Stack Tecnológica e Integrações Ativas
- **Framework:** Next.js 16 (App Router) — ver `AGENTS.md`: há breaking changes frente a versões anteriores.
- **Banco de Dados & RAG:** Supabase (PostgreSQL + extensão `pgvector`)
- **IA (LLM):** OpenRouter via `@openrouter/ai-sdk-provider` — modelo em `OPENROUTER_MODELO_LLM` (default `nvidia/nemotron-3-ultra-550b-a55b:free`, tier gratuito, 50 req/dia).
- **Embeddings:** Gemini via `@ai-sdk/google` — `gemini-embedding-001` truncado em 768-D (`GEMINI_MODELO_EMBEDDING`). Híbrido porque a chave Gemini tem cota zero em geração e a OpenRouter não tem embedding gratuito.

> ⚠️ Os modelos originalmente especificados aqui (`gemini-1.5-flash` e `text-embedding-004`) foram **retirados da API do Google** e não respondem mais. Os substitutos acima foram verificados contra a chave real do projeto.
- **Orquestração de IA:** Vercel AI SDK (`ai` package)
- **Gatilhos:** Vercel Cron Jobs (`vercel.json`)
- **Ferramentas de Contexto (IDE):** MCP do Supabase e MCP da Vercel estão ativos. Utilize-os para inspecionar os schemas reais das tabelas e gerenciar variáveis de ambiente automaticamente.

---

## ⚙️ Variáveis de Ambiente Necessárias (`.env.local`)
A aplicação exige as seguintes chaves. Não defina chaves de infraestrutura em hardcode.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="anon_key_para_consultas_client_side"
SUPABASE_SERVICE_ROLE_KEY="service_role_key_para_bypassar_rls_nas_apis"

# Google AI (Gemini) — só embeddings
GOOGLE_GENERATIVE_AI_API_KEY="api_key_do_google_ai_studio"
GEMINI_MODELO_EMBEDDING="gemini-embedding-001"

# OpenRouter — geração do diagnóstico e chat
OPENROUTER_API_KEY="sk-or-v1-..."
OPENROUTER_MODELO_LLM="nvidia/nemotron-3-ultra-550b-a55b:free"
OPENROUTER_MODELO_CHAT="nvidia/nemotron-3-super-120b-a12b:free"

# Segurança (Cron)
CRON_SECRET=***REMOVED***

```

---

## 🗄️ Estrutura de Rotas (Route Handlers)

O backend deve ser implementado no diretório `/app/api/` contendo os seguintes endpoints:

### 1. `POST /api/inteligencia/analisar` (`app/api/inteligencia/analisar/route.ts`)

> Implementada no Módulo 4/Task 4.3. O nome foi aportuguesado para acompanhar o restante da API (`/api/motor/*`, `/api/ingestao/*`).

**Propósito:** Rota principal de orquestração RAG + LLM. Recebe os dados de um cliente, cruza com o banco vetorial e gera o plano de ação estruturado.

**Payload de Entrada Esperado:**

```json
{
  "cliente_id": "C001", // UUID da entidade OU o id_externo da planilha
  "trigger_source": "manual" // "manual" ou "cron"
}

```

**Fluxo de Execução:**

1. **Coleta de Evidências:** Lê a **última predição persistida** do cliente (`predicoes` + `motivos_predicao`, com os rótulos de `definicoes_metricas`) — o raio-x produzido pelo motor matemático do Módulo 3. O motor **não** é recalculado: o z-score de carteira depende de toda a carteira. Sem predição, a rota responde **422** pedindo que `POST /api/motor/calcular` rode antes.
2. **Busca RAG (pgvector):** Execute uma query via `rpc` (Remote Procedure Call) no Supabase para buscar os 3 perfis históricos de clientes mais similares utilizando a métrica de distância cosseno ou produto escalar no banco vetorial. Retorne as ações tomadas e os desfechos (recuperado/cancelado) desses clientes.
3. **Prompting e IA:**

* Inicialize o Vercel AI SDK (`generateObject`).
* Configure o modelo via `obterModeloLlm()` (`lib/ia/constantes.ts`), não com o id em hardcode. O schema Zod vira `response_format: json_schema` na OpenRouter; a saída ainda passa por `normalizarDiagnostico` (remove numeração embutida nos itens do plano).
* Monte um prompt de sistema injetando as evidências atuais e os casos similares recuperados do `pgvector`.

4. **Retorno (Output Zod Schema):** Força a resposta no formato JSON estrito abaixo (`lib/ia/esquema.ts`), persistido em `diagnosticos_ia` junto dos casos do RAG usados, do modelo e do gatilho:

```json
{
  "diagnostico_principal": "Descrição breve do principal ofensor.",
  "analise_lookalike": "Comparação com o histórico de clientes parecidos.",
  "plano_acao_imediato": ["Ação 1", "Ação 2", "Ação 3"]
}

```

### 2. `GET /app/api/cron/daily-check/route.ts`

**Propósito:** Gatilho automatizado disparado pela Vercel para identificar proativamente degradação de engajamento na base de clientes.

**Regras de Execução:**

1. **Autenticação:** Valide se o header `Authorization: Bearer [CRON_SECRET]` é igual à variável de ambiente `CRON_SECRET`.
2. **Varredura:** Faça um `SELECT` no Supabase buscando clientes cujo *Health Score* tenha ultrapassado o limite de risco (foco especial na queda de "Uso do Sistema" e "Faltas em Agendas").
3. **Orquestração Interna:** Para cada cliente identificado em risco, chame `analisarRiscoEntidade` diretamente (função exportada, sem passar por HTTP).
4. **Persistência:** Os diagnósticos são gravados em **`diagnosticos_ia`** (tabela criada no Módulo 4; o schema original não tinha destino para a saída da IA). Reutilize `analisarRiscoEntidade` de `lib/ia/analisar.ts` com `origemGatilho: 'cron'` em vez de chamar a rota via HTTP.

### 3. `POST /api/inteligencia/feedback` (`app/api/inteligencia/feedback/route.ts`)

**Propósito:** Fechar o ciclo de aprendizado de máquina (Feedback Loop), retroalimentando o banco vetorial com novos casos baseados na ação da equipe de Customer Success.

**Payload de Entrada Esperado:**

```json
{
  "cliente_id": "C001",
  "acao_realizada": "Reunião executiva de re-onboarding",
  "desfecho": "recuperado", // ou "cancelado"
  "contexto_texto": "opcional — só para indexar casos anteriores à adoção do sistema"
}

```

**Fluxo de Execução:**

1. Utilize o modelo de embeddings do Google (via AI SDK) para transformar o texto concatenado do contexto do cliente + `acao_realizada` + `desfecho` em um vetor numérico.
2. Faça um `INSERT` na tabela histórica do Supabase (que contém a coluna de tipo `vector`) armazenando o perfil consolidado. Isso garante que a Rota 1 seja cada vez mais precisa.

### 4. `POST /api/inteligencia/chat` (`app/api/inteligencia/chat/route.ts`)

**Propósito:** assistente conversacional do painel (widget "Sinalys"). Apoia o analista sugerindo como agir com um cliente, o que merece atenção e o que o histórico diz — sempre consultando dados reais por ferramentas **somente leitura**. Não executa ações.

**Payload de Entrada Esperado** (formato do `useChat` do AI SDK; exige sessão):

```json
{
  "messages": [{ "id": "u1", "role": "user", "parts": [{ "type": "text", "text": "Como devo agir com este cliente?" }] }],
  "tela": { "caminho": "/clientes/C004", "clienteId": "C004" }
}
```

**Fluxo:** `streamText` com `OPENROUTER_MODELO_CHAT` + ferramentas de `lib/ia/chat/ferramentas.ts` (fila de prioridade, resumo da carteira, raio-x do cliente, casos similares), até 5 passos por turno. Resposta em stream de `UIMessage` (`toUIMessageStreamResponse`). A `tela` entra no prompt de sistema para "este cliente" resolver sem o analista digitar o código.

---

## 🚨 Restrições de Código e Padrões

* **Runtime:** o Edge Runtime foi **descontinuado no Next.js 16** (ver `node_modules/next/dist/docs/.../route-segment-config/runtime.md`). As rotas usam `runtime = 'nodejs'`, que é o default. Rotas que chamam o LLM declaram `maxDuration` por excederem o limite padrão de 10s do plano Hobby.
* **Tipagem (TypeScript):** Exporte interfaces locais para as respostas do Supabase e utilize validação `zod` no `generateObject` para assegurar contratos de API rígidos.
* **Isolamento RLS:** Certifique-se de que instâncias do cliente Supabase criadas na API para operações de IA utilizem a `SERVICE_ROLE_KEY`. Consultas de leitura originadas diretamente de Server Components no frontend devem usar a `ANON_KEY`.

```

```
