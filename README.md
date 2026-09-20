# Sinalys

Plataforma de prevenção de churn: ingestão agnóstica de planilhas, motor matemático de risco/urgência e camada de inteligência (RAG + LLM) sobre Supabase. Aplicação full-stack em Next.js (App Router) com deploy nativo na Vercel — frontend e API (Route Handlers em `app/api/`) vivem no mesmo projeto.

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha as variáveis abaixo
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Variáveis de ambiente usadas pelo app:

| Variável | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | Cliente Supabase no browser / sessão |
| `SUPABASE_SERVICE_ROLE_KEY` | Cliente admin nas rotas de API e scripts |
| `SUPABASE_STORAGE_BUCKET_INGESTAO` | Bucket privado dos arquivos brutos de ingestão |
| `DEFAULT_PROJETO_ID` | Projeto padrão enquanto não há multi-tenant |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODELO_LLM`, `OPENROUTER_MODELO_CHAT` | Geração (diagnóstico e chat) |
| `GOOGLE_GENERATIVE_AI_API_KEY`, `GEMINI_MODELO_EMBEDDING` | Embeddings (indexação e busca lookalike) |
| `NEXT_PUBLIC_APP_URL` | Base URL pública (links compartilháveis) |

## Estrutura do repositório

```
app/                      Rotas (App Router)
  (app)/                  Páginas autenticadas do painel
  api/                    Route Handlers (API serverless)
  health/[token]/         Página pública de Health Score
  login/
components/               Componentes React, agrupados por feature
  ui/                     Primitivos reutilizáveis (Button, Card, ícones, ...)
  layout/                 Shell, sidebar, navegação
  clientes/               Lista, detalhe, simulador e ações sobre o cliente
    acoes/                Modais de contato, resolução e cancelamento
  dashboard/, ingestao/, configuracoes/, recuperacao/, relatorios/, playbook/
  assistente/, ia/, health/
hooks/                    Hooks React (camada de apresentação)
lib/                      Lógica de domínio e infraestrutura (sem JSX)
  motor/                  Motor matemático: normalização, score, urgência, simulador
  risco/                  Faixas de risco (domínio) e seus estilos (apresentação)
  ia/                     Provedores, prompts, embeddings, RAG e ferramentas do chat
  ingestao/               Parser de planilhas, normalização e cliente HTTP das rotas
  painel/                 Consultas que alimentam o painel (KPIs, fila, detalhe)
  health/                 Página pública de Health Score e agendamento
  auth/, cancelamento/, contatos/, config/
  supabase/               Clientes Supabase (server, admin, proxy) e paginação
  utils/                  Formatação de datas e moeda
  mock/                   Dados fictícios das telas ainda não conectadas ao backend
db/                       Schema (`modelagem.sql`) e políticas RLS (`rls.sql`) do Supabase
scripts/                  Scripts operacionais (backfill do motor, clientes de teste)
docs/                     Especificações, decisões e histórico de tarefas
public/                   Assets estáticos
proxy.ts                  Proxy de requisições (sessão Supabase, redirecionamentos)
```

Convenções:

- `lib/` nunca importa de `components/` nem de `hooks/`; a dependência é sempre no sentido `app → components/hooks → lib`.
- Cada feature em `lib/` expõe `tipos.ts` e `constantes.ts` quando precisa; módulos client-safe não importam Supabase.
- Rotas em `app/api/` são finas: validam a entrada e delegam para `lib/`.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e execução de produção |
| `npm run lint` | ESLint |
| `npx tsx scripts/backfill-motor.mts` | Recalcula predições históricas |
| `npx tsx scripts/clientes-teste-motor.mts` | Cria cópias de clientes para validar o motor |

## Deploy

Push para um repositório conectado à Vercel, ou `vercel` pela CLI. Os scripts SQL em `db/` devem ser aplicados no projeto Supabase antes do primeiro deploy.

## Documentação

- [docs/setup.md](docs/setup.md) — bloco de ingestão e mapeamento
- [docs/motor-matematico.md](docs/motor-matematico.md) — motor de risco e urgência
- [docs/inteligencia.md](docs/inteligencia.md) — RAG e orquestração de IA
- [docs/TASKS.md](docs/TASKS.md) e [docs/TASKS-ATUALIZACAO.md](docs/TASKS-ATUALIZACAO.md) — histórico e pendências
