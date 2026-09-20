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
- 🐛 **[Corrigido] Timeout no processamento de arquivos reais:** `POST /api/ingestao/processar` fazia 2 round-trips ao Supabase *por entidade única* (SELECT + INSERT/UPDATE sequenciais) em `lib/ingestao/normalizar.ts`. Num arquivo real com 80 clientes × 4 abas isso eram ~640 round-trips sequenciais e **120s de execução** — inviável em função serverless (Vercel) e provável causa de duas execuções do usuário terem ficado presas em `pendente` sem nenhum mapeamento salvo. Corrigido para 1 SELECT em lote (`.in('id_externo', [...])`) + 1 UPSERT em lote por aba (lotes de 500), reduzindo o mesmo arquivo para **~14s**. Observações/eventos também passaram a ser gravados em lotes de 1000 (`emLotes` em `lib/ingestao/normalizar.ts`) por segurança em arquivos ainda maiores.
- 🎨 **[Adicionado] Opção de ignorar aba inteira no mapeamento:** `components/ingestao/MapeamentoStep.tsx` — cada aba detectada agora tem um botão "×"/"+" ao lado do nome para marcá-la como ignorada (não some da lista, só some da importação). Resolve a confusão com abas não tabulares como "Leia-me"/"dicionario" em planilhas reais, que antes exigiam marcar "Ignorar coluna" em cada coluna manualmente.

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

- [X] **Task 4.1:** Configurar a integração com a API do Gemini utilizando o Vercel AI SDK (`@ai-sdk/google`). _(`lib/ia/provedor.ts` + `lib/ia/constantes.ts`. Instalados `ai@7`, `@ai-sdk/google@4`, `zod@4`. Modelos configuráveis por env var — os do doc original foram retirados da API, ver pendência abaixo.)_
- [X] **Task 4.2:** Implementar a busca semântica por similaridade via `pgvector` no Supabase para resgatar o histórico de desfechos (lookalike). _(`lib/ia/lookalike.ts` + RPC `buscar_casos_similares` no Postgres. Ordenação/corte no banco para usar o índice HNSW. **Validada com dados reais**, ver números abaixo.)_
- [X] **Task 4.3:** Criar a rota de orquestração que consolida o contexto atual e histórico para gerar o diagnóstico e plano de ação estruturado (JSON). _(`POST /api/inteligencia/analisar` + `lib/ia/analisar.ts`. Saída forçada por schema Zod via `generateObject`, persistida em `diagnosticos_ia`. **Não validada contra o LLM real** — cota zerada, ver pendência.)_

**Rotas e biblioteca implementadas:**

- `lib/ia/*.ts`: `provedor` (cliente Gemini), `embeddings` (vetor 768-D normalizado), `descricao` (texto canônico do perfil), `contexto` (raio-x da última predição), `lookalike` (Task 4.2), `esquema`/`prompt` (contrato e persona), `analisar` (Task 4.3), `indexar` (feedback loop). As funções são exportadas para o Vercel Cron do Módulo 5.4 chamar sem passar por HTTP.
- `POST /api/inteligencia/analisar`: orquestração RAG + LLM. `cliente_id` aceita UUID **ou** `id_externo`. Erros: 400 (payload), 404 (entidade), 422 (sem predição).
- `POST /api/inteligencia/feedback`: vetoriza e indexa o desfecho na base histórica (antecipado do 5.3 por decisão do usuário — sem ele a Task 4.2 não teria dados para existir). A UI do feedback continua na Task 5.3.

**Objetos criados no banco (migration `modulo4_inteligencia_rag`, refletida em `docs/modelagem.sql`):**

- Tabela `diagnosticos_ia` — o `docs/instructions.md` mandava gravar numa "tabela de alertas" que **nunca existiu** no schema. Guarda o diagnóstico, os casos do RAG usados (auditoria), o modelo e o gatilho (`manual`/`cron`).
- Função `buscar_casos_similares(projeto, embedding, limite, entidade_excluida, similaridade_minima)` — `SECURITY INVOKER` e `search_path = ''`, para respeitar RLS quando ele for habilitado.

**Decisões de arquitetura tomadas nesta etapa (validadas com o usuário via perguntas diretas):**

- **Modelos:** `gemini-2.5-flash` (LLM) e `gemini-embedding-001` truncado em 768-D (embeddings), ambos em env vars (`GEMINI_MODELO_LLM`/`GEMINI_MODELO_EMBEDDING`). Os do doc original (`gemini-1.5-flash`, `text-embedding-004`) **não existem mais na API**. O truncamento em 768-D foi verificado na API real e preserva a coluna `vector(768)` e o índice HNSW sem migration.
- **Contexto atual** vem da **última predição persistida**, nunca de recálculo: o z-score de carteira depende de toda a carteira, então recalcular uma entidade isolada seria caro e inconsistente. Sem predição → 422.
- **Nomes de rota em português**, acompanhando `/api/motor/*` e `/api/ingestao/*`, divergindo da letra do `docs/instructions.md` (doc atualizado).
- **Texto canônico do perfil** (`lib/ia/descricao.ts`) é compartilhado entre indexação e consulta — essa simetria é o que faz a similaridade funcionar. Ele omite nome do cliente e valores em reais de propósito: o que deve aproximar dois casos é o padrão de comportamento, não quem é o cliente. **Alterar o formato exige reindexar a base.**
- **Embeddings gravados normalizados** (norma 1). Indiferente para cosseno, mas deixa aberta a troca futura para produto interno (`<#>`), mais barato.

**Validação executada (Task 4.2, dados reais do projeto seed):**

- 3 casos indexados via `POST /api/inteligencia/feedback` (dados fictícios de MVP, autorizados pelo usuário). Vetores conferidos no banco: **768 dimensões, norma 1.0000**.
- Busca com o embedding de um caso contra ele mesmo: **similaridade 1.0000 exata** (prova de que normalização e cosseno estão corretos).
- Ranking decrescente correto (0.8946 / 0.8721), exclusão da própria entidade e limiar mínimo funcionando.
- Observação honesta: com textos tão estruturados, as similaridades se concentram em faixa alta (>0.85 entre casos de perfis bem diferentes). O piso padrão de `0.5` (`PADRAO_SIMILARIDADE_MINIMA`) é, na prática, permissivo demais para discriminar — **recalibrar quando a base tiver volume real**.
- `POST /api/inteligencia/analisar` percorreu todo o pipeline (entidade → contexto → embedding → RPC) e só parou na chamada ao Gemini, por cota. Erros 400/404 conferidos.

**Pendências registradas durante a execução do Módulo 4:**

- 🚨 **Cota do Gemini zerada — Tasks 4.1/4.3 não validadas ponta a ponta.** A chave atual retorna `429` com `quota_limit_value: "0"` em **`generateContent`**, para todos os modelos e em `v1` e `v1beta`; `embedContent` funciona normalmente (por isso a 4.2 pôde ser validada). Não é excesso de uso: é ausência de cota no projeto GCP `779681085062`. **Ação necessária:** gerar uma chave nova no Google AI Studio em um projeto novo, ou habilitar billing no projeto atual. Depois disso, validar com `POST /api/inteligencia/analisar` — nenhuma mudança de código deve ser necessária.
- ⚠️ **Env vars não propagadas para a Vercel:** o MCP da Vercel retornou `403 forbidden` no scope `hugo-almeidas-projects-6d9d1f54` (token precisa ser reautenticado). Registrar manualmente no painel ou via `vercel env add GEMINI_MODELO_LLM` / `GEMINI_MODELO_EMBEDDING`. **Não é bloqueante:** ambas têm default no código.
- ⚠️ **RLS ainda desabilitado** nas agora **14** tabelas (herdado dos Módulos 2 e 3). `diagnosticos_ia` nasceu sem RLS pelo mesmo motivo; `buscar_casos_similares` já foi escrita como `SECURITY INVOKER` para respeitar policies quando existirem.
- ⚠️ **Autenticação/multi-tenant:** as duas rotas novas seguem o mesmo padrão (`DEFAULT_PROJETO_ID` como fallback). Revisitar junto com as demais.
- ⚠️ **Sem rota HTTP dedicada para a Task 4.2:** a busca lookalike existe como função (`buscarCasosSimilares`) consumida pela 4.3, mas não como endpoint próprio. Se o painel do Módulo 5.2 precisar exibir "clientes parecidos" sem gerar um diagnóstico, criar um `GET /api/inteligencia/lookalike`.
- ⚠️ **Casos de teste permanecem na base:** os 3 casos indexados na validação continuam em `casos_historicos_embeddings`. Como todo o banco é fictício de MVP, foram mantidos de propósito — apagar antes de qualquer uso real.
- 🔐 **`.env.example` continha a chave real do Gemini em texto plano** (não um placeholder). Substituída por placeholder. Verificado: o arquivo **nunca foi commitado** (`.gitignore` cobre `.env*`), então não houve vazamento no histórico do git.

## 🔐 Autenticação (simplificada) — feita antes do Módulo 5

- [X] **Login e-mail/senha via Supabase Auth** (`@supabase/ssr@0.12.7`, pinado). `POST /api/auth/login` (`{ email, senha }` → cookies httpOnly de sessão; 401 genérico em falha) e `POST /api/auth/logout`. `proxy.ts` na raiz (convenção do Next 16, substitui `middleware.ts`) renova o token a cada request e faz o guard: sem sessão → `/login`; com sessão em `/login` → `/`. `app/(app)/layout.tsx` repete a checagem (`getUser`) e injeta o usuário em Topbar/MobileHeader/saudação da home (`lib/auth/usuario.ts`). Sem cadastro nem "esqueci a senha".
- **Usuário seed** criado no Supabase Auth: `ana.souza@globalsys.com` / `sinalys123` (os defaults da tela de login), com `app_metadata.projeto_id = DEFAULT_PROJETO_ID` — é por aí que as rotas devem resolver o tenant quando abandonarem o fallback por env var. **Trocar a senha antes de qualquer uso real.**

**Pendências registradas nesta etapa:**

- ⚠️ **`/api/*` continua sem autenticação** (matcher do `proxy.ts` exclui `api` de propósito): as rotas usam `service_role` e são chamadas por scripts/cron sem cookie. Próximo passo: nas rotas do painel, ler `projeto_id` de `app_metadata` via `obterUsuarioSessao()` em vez de `DEFAULT_PROJETO_ID`, e proteger as rotas que não forem de cron (`CRON_SECRET`).
- ⚠️ **RLS segue desabilitado** — o cliente de sessão (`lib/supabase/server.ts`) usa a chave pública e já respeitará policies quando existirem.

## 🖥️ Módulo 5: Painel de Atendimento e Feedback Loop

- [ ] **Task 5.1:** Desenvolver o painel no frontend Next.js exibindo a fila de priorização de Customer Success ordenada por urgência.
- [ ] **Task 5.2:** Criar visualização detalhada por cliente contendo o raio-x atual, evidências de risco e a recomendação prescritiva da IA.
- [ ] **Task 5.3:** Implementar o fluxo de feedback humano (registro de desfecho e ação realizada) para retroalimentar o banco vetorial.
- [ ] **Task 5.4:** Configurar o Vercel Cron Job para varredura diária automatizada de riscos e geração proativa de alertas.
