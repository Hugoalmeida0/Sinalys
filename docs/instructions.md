
```markdown
# 📖 Instruções de Arquitetura e Fluxo da API (MVP Prevenção de Churn)

## 🎯 Objetivo
Desenvolver o backend unificado do MVP de prevenção de churn utilizando Next.js (App Router), projetado para deploy serverless na Vercel a custo zero. O sistema orquestra a coleta de dados de engajamento, realiza busca semântica em histórico de cancelamentos (RAG) e gera planos de ação utilizando IA generativa.

## 🛠️ Stack Tecnológica e Integrações Ativas
- **Framework:** Next.js 14+ (App Router)
- **Banco de Dados & RAG:** Supabase (PostgreSQL + extensão `pgvector`)
- **IA (LLM):** Gemini 1.5 Flash (via `@ai-sdk/google`)
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

# Google AI (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY="api_key_do_google_ai_studio"

# Segurança (Cron)
CRON_SECRET=***REMOVED***

```

---

## 🗄️ Estrutura de Rotas (Route Handlers)

O backend deve ser implementado no diretório `/app/api/` contendo os seguintes endpoints:

### 1. `POST /app/api/analyze-churn/route.ts`

**Propósito:** Rota principal de orquestração RAG + LLM. Recebe os dados de um cliente, cruza com o banco vetorial e gera o plano de ação estruturado.

**Payload de Entrada Esperado:**

```json
{
  "cliente_id": "C001",
  "trigger_source": "manual" // "manual" ou "cron"
}

```

**Fluxo de Execução:**

1. **Coleta de Evidências:** Utilize o Supabase Client (com `SERVICE_ROLE_KEY`) para buscar os dados consolidados do cliente atual (ex: uso da plataforma, SLA cumprido, atrasos de pagamento, NPS).
2. **Busca RAG (pgvector):** Execute uma query via `rpc` (Remote Procedure Call) no Supabase para buscar os 3 perfis históricos de clientes mais similares utilizando a métrica de distância cosseno ou produto escalar no banco vetorial. Retorne as ações tomadas e os desfechos (recuperado/cancelado) desses clientes.
3. **Prompting e IA:**

* Inicialize o Vercel AI SDK (`generateObject`).
* Configure o modelo para `google('gemini-1.5-flash')`.
* Monte um prompt de sistema injetando as evidências atuais e os casos similares recuperados do `pgvector`.

4. **Retorno (Output Zod Schema):** Force a resposta no seguinte formato JSON estrito:

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
3. **Orquestração Interna:** Para cada cliente identificado em risco, acione internamente a lógica do `analyze-churn` para gerar o diagnóstico.
4. **Persistência:** Salve os diagnósticos gerados na tabela de alertas do Supabase para consumo posterior do frontend.

### 3. `POST /app/api/feedback/route.ts`

**Propósito:** Fechar o ciclo de aprendizado de máquina (Feedback Loop), retroalimentando o banco vetorial com novos casos baseados na ação da equipe de Customer Success.

**Payload de Entrada Esperado:**

```json
{
  "cliente_id": "C001",
  "acao_realizada": "Reunião executiva de re-onboarding",
  "desfecho": "recuperado" // ou "cancelado"
}

```

**Fluxo de Execução:**

1. Utilize o modelo de embeddings do Google (via AI SDK) para transformar o texto concatenado do contexto do cliente + `acao_realizada` + `desfecho` em um vetor numérico.
2. Faça um `INSERT` na tabela histórica do Supabase (que contém a coluna de tipo `vector`) armazenando o perfil consolidado. Isso garante que a Rota 1 seja cada vez mais precisa.

---

## 🚨 Restrições de Código e Padrões

* **Edge Computing Compatibility:** Não utilize bibliotecas Node.js nativas incompatíveis com o ambiente Edge da Vercel (como `fs` ou chamadas pesadas de sistema).
* **Tipagem (TypeScript):** Exporte interfaces locais para as respostas do Supabase e utilize validação `zod` no `generateObject` para assegurar contratos de API rígidos.
* **Isolamento RLS:** Certifique-se de que instâncias do cliente Supabase criadas na API para operações de IA utilizem a `SERVICE_ROLE_KEY`. Consultas de leitura originadas diretamente de Server Components no frontend devem usar a `ANON_KEY`.

```

```
