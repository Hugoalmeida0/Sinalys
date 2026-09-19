# 📋 Task List — MVP Agnóstico de Prevenção de Churn

Este documento define as tarefas de desenvolvimento macro e genéricas necessárias para estruturar o MVP da plataforma, mantendo o ecossistema agnóstico, com persistência relacional/vetorial e motor de IA integrado.

---

## 🚀 Módulo 1: Infraestrutura e Configuração Base

- [X] **Task 1.1:** Inicializar o projeto unificado em Next.js (App Router) configurado para deploy serverless na Vercel. _(deploy em produção ativo em sinalys.vercel.app)_
- [X] **Task 1.2:** Executar o script SQL (`modelagem.sql`) no Supabase para provisionar o banco relacional e habilitar a extensão `pgvector`.
- [X] **Task 1.3:** Configurar as variáveis de ambiente centrais (`.env.local` e painel Vercel) para conexão com Supabase e chaves de IA.

## 📥 Módulo 2: Ingestão e Mapeamento Agnóstico

- [X] **Task 2.1:** Criar rota de upload de arquivos (Excel/CSV) para registrar as execuções de ingestão. _(`POST /api/ingestao/upload`: arquiva o arquivo bruto no Supabase Storage — bucket privado `ingestao-raw` — registra `execucoes_ingestao` e devolve abas/colunas detectadas. Componente de UI fica pendente, ver seção "A fazer no front" abaixo.)_
- [X] **Task 2.2:** Desenvolver o endpoint de mapeamento dinâmico (De-Para), permitindo associar colunas arbitrárias às definições de métricas e entidades. _(`GET/POST /api/ingestao/mapeamento` grava em `mapeamentos_importacao`; `GET/POST /api/definicoes-metricas` lista/cria métricas customizadas sob demanda. Interface de UI fica pendente.)_
- [X] **Task 2.3:** Implementar o parser universal que normaliza e persiste os dados de diferentes fontes na tabela padronizada de observações. _(`POST /api/ingestao/processar`: baixa o arquivo arquivado, aplica o De-Para salvo e grava em `entidades`/`observacoes`/`eventos_desfecho`, com coerção de tipo por `definicoes_metricas.tipo_valor`. Ver `lib/ingestao/`.)  _

**Pendências registradas durante a execução do Módulo 2:**

- ⚠️ **Autenticação/multi-tenant:** ainda não existe login. Todas as rotas usam um `projeto_id` padrão fixo via env var `DEFAULT_PROJETO_ID` (seed `InovaApps S/A` / `Previsao de Churn - B2B`, id `8a13faae-c4df-4364-8e20-4d44ac37ff53`). Quando a autenticação for implementada, substituir esse fallback pela resolução do `projeto_id` a partir do usuário autenticado em todas as rotas de `app/api/ingestao/**` e `app/api/definicoes-metricas`.
- ⚠️ **RLS desabilitado:** as 13 tabelas do schema estão sem Row Level Security (a `anon key` tem acesso total). Decisão explícita: manter assim por ora, pois as rotas atuais usam apenas a `service_role_key` (ignora RLS) e não há chave anon exposta em uso. Revisitar ao implementar autenticação/frontend com acesso client-side ao Supabase.

**A fazer no front (fora do escopo desta etapa, backend-only):**

- [ ] Componente de upload de arquivo (Excel/CSV) consumindo `POST /api/ingestao/upload`.
- [ ] Interface de mapeamento De-Para (selects de coluna → tipo de destino/métrica) consumindo `GET/POST /api/ingestao/mapeamento` e `GET/POST /api/definicoes-metricas`.
- [ ] Tela de acompanhamento do status da execução de ingestão (`pendente`/`processando`/`concluido`/`falhou`) e exibição do relatório/erros retornado por `POST /api/ingestao/processar`.
- [ ] Definir biblioteca de componentes de UI (nenhuma está instalada hoje — decisão adiada, ver histórico da conversa).

## ⚙️ Módulo 3: Motor Matemático de Risco e Urgência

- [X] **Task 3.1:** Implementar a rotina de normalização de métricas (cálculo de desvio padrão/Z-score e média móvel temporal). _(`lib/motor/normalizacao.ts`: `calcularZScoreCarteira` — z-score da entidade vs. média/desvio da carteira — e `calcularMediaMovel` — z-score da janela recente vs. o próprio histórico da entidade. Omissão de dado é tratada como sinal de risco (não como zero), ver `lib/motor/calcular.ts`.)_
- [X] **Task 3.2:** Desenvolver a lógica de cálculo do Score de Risco baseada na aplicação dos pesos configurados nas regras do modelo. _(`lib/motor/score.ts`: `pontuacao = Σ(valor_normalizado × peso) / Σ(peso)` — média ponderada, não soma pura, para respeitar o CHECK 0-100 de `predicoes.pontuacao`. `faixa_risco` reaproveita `faixaRiscoFromScore` de `lib/risk.ts`. `cobertura` = proporção de regras avaliáveis.)_
- [X] **Task 3.3:** Criar o cálculo da Matriz de Urgência cruzando a probabilidade de risco com o impacto financeiro (receita) para gerar a ordenação da fila. _(`lib/motor/urgencia.ts`: `score_urgencia = pontuacao × valor_impacto`, calculado sob demanda — não persistido em coluna própria. `valor_impacto` vem da métrica reservada `receita_mensal`. `GET /api/motor/fila` devolve a fila ordenada.)_

**Rotas e biblioteca implementadas:**

- `lib/motor/*.ts`: funções puras de normalização, score e urgência, reutilizáveis pelo Vercel Cron do Módulo 5.4.
- `POST /api/motor/calcular`: roda o motor completo (3.1→3.3) para todas as entidades de um projeto sob um modelo (`modelo_id` ou o modelo `ativo` do projeto) e data de referência (`referencia_em`, default agora), persistindo em `predicoes`/`motivos_predicao`.
- `GET /api/motor/fila`: devolve a predição mais recente de cada entidade, ordenada por Score de Urgência (Task 3.3).

**Decisões de arquitetura tomadas nesta etapa (validadas com o usuário via perguntas diretas):**

- Direção do risco (`maior_pior`/`menor_pior`) fica em `regras_modelo.config_regra.direcao`, não em `definicoes_metricas` — permite a mesma métrica ter sentidos diferentes entre modelos.
- Receita mensal (impacto financeiro) vem de uma métrica reservada com código fixo `receita_mensal` (`lib/motor/constantes.ts`), buscada como observação normal — mantém o padrão agnóstico do schema.
- Métrica ausente para uma entidade é pontuada com `pontuacao_omissao` (default 70, configurável por regra) e conta como regra avaliada (`acionado=true`) — distinto de "não avaliável" (`acionado=null`), reservado para quando a carteira/histórico não tem dados suficientes para a comparação estatística (ex: <2 valores na carteira, <2 pontos de histórico anterior à janela).

**Pendências registradas durante a execução do Módulo 3:**

- ⚠️ **CRUD de `modelos`/`regras_modelo`:** não implementado nesta etapa (decisão explícita do usuário — fora do escopo declarado do Módulo 3). Um modelo de teste (`status='ativo'`, 3 regras cobrindo `zscore_carteira` e `media_movel`) foi inserido manualmente via MCP do Supabase para validar o motor ponta a ponta. Criar endpoints de gestão de modelo/pesos antes de expor isso a usuários finais.
- ⚠️ **RLS ainda desabilitado** nas 13 tabelas (herdado do Módulo 2 — decisão já registrada lá). Sem mudanças nesta etapa.
- ⚠️ **Autenticação/multi-tenant:** `POST /api/motor/calcular` e `GET /api/motor/fila` seguem o mesmo padrão do Módulo 2 (`DEFAULT_PROJETO_ID` como fallback). Revisitar junto com as demais rotas quando a autenticação for implementada.
- Validado ponta a ponta via `POST /api/motor/calcular` e `GET /api/motor/fila` contra dados reais do projeto seed (2 entidades, cenário de queda abrupta de uso e contraste de receita/risco) — ver histórico da conversa para os números.

## 🧠 Módulo 4: Inteligência, RAG e Orquestração de IA

- [ ] **Task 4.1:** Configurar a integração com a API do Gemini utilizando o Vercel AI SDK (`@ai-sdk/google`).
- [ ] **Task 4.2:** Implementar a busca semântica por similaridade via `pgvector` no Supabase para resgatar o histórico de desfechos (lookalike).
- [ ] **Task 4.3:** Criar a rota de orquestração que consolida o contexto atual e histórico para gerar o diagnóstico e plano de ação estruturado (JSON).

## 🖥️ Módulo 5: Painel de Atendimento e Feedback Loop

- [ ] **Task 5.1:** Desenvolver o painel no frontend Next.js exibindo a fila de priorização de Customer Success ordenada por urgência.
- [ ] **Task 5.2:** Criar visualização detalhada por cliente contendo o raio-x atual, evidências de risco e a recomendação prescritiva da IA.
- [ ] **Task 5.3:** Implementar o fluxo de feedback humano (registro de desfecho e ação realizada) para retroalimentar o banco vetorial.
- [ ] **Task 5.4:** Configurar o Vercel Cron Job para varredura diária automatizada de riscos e geração proativa de alertas.
