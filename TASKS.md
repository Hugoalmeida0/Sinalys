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

- [X] **Task 4.1:** Configurar a integração com a API do Gemini utilizando o Vercel AI SDK (`@ai-sdk/google`). _(`lib/ia/provedor.ts` + `lib/ia/constantes.ts`. Instalados `ai@7`, `@ai-sdk/google@4`, `@openrouter/ai-sdk-provider@3`, `zod@4`. **Arquitetura híbrida:** geração via OpenRouter (modelo gratuito), embeddings via Gemini — ver decisões abaixo.)_
- [X] **Task 4.2:** Implementar a busca semântica por similaridade via `pgvector` no Supabase para resgatar o histórico de desfechos (lookalike). _(`lib/ia/lookalike.ts` + RPC `buscar_casos_similares` no Postgres. Ordenação/corte no banco para usar o índice HNSW. **Validada com dados reais**, ver números abaixo.)_
- [X] **Task 4.3:** Criar a rota de orquestração que consolida o contexto atual e histórico para gerar o diagnóstico e plano de ação estruturado (JSON). _(`POST /api/inteligencia/analisar` + `lib/ia/analisar.ts`. Saída forçada por schema Zod via `generateObject`, persistida em `diagnosticos_ia`. **Validada ponta a ponta contra o LLM real** via OpenRouter, ver números abaixo.)_

**Rotas e biblioteca implementadas:**

- `lib/ia/*.ts`: `provedor` (cliente Gemini), `embeddings` (vetor 768-D normalizado), `descricao` (texto canônico do perfil), `contexto` (raio-x da última predição), `lookalike` (Task 4.2), `esquema`/`prompt` (contrato e persona), `analisar` (Task 4.3), `indexar` (feedback loop). As funções são exportadas para o Vercel Cron do Módulo 5.4 chamar sem passar por HTTP.
- `POST /api/inteligencia/analisar`: orquestração RAG + LLM. `cliente_id` aceita UUID **ou** `id_externo`. Erros: 400 (payload), 404 (entidade), 422 (sem predição).
- `POST /api/inteligencia/feedback`: vetoriza e indexa o desfecho na base histórica (antecipado do 5.3 por decisão do usuário — sem ele a Task 4.2 não teria dados para existir). A UI do feedback continua na Task 5.3.

**Objetos criados no banco (migration `modulo4_inteligencia_rag`, refletida em `docs/modelagem.sql`):**

- Tabela `diagnosticos_ia` — o `docs/instructions.md` mandava gravar numa "tabela de alertas" que **nunca existiu** no schema. Guarda o diagnóstico, os casos do RAG usados (auditoria), o modelo e o gatilho (`manual`/`cron`).
- Função `buscar_casos_similares(projeto, embedding, limite, entidade_excluida, similaridade_minima)` — `SECURITY INVOKER` e `search_path = ''`, para respeitar RLS quando ele for habilitado.

**Decisões de arquitetura tomadas nesta etapa (validadas com o usuário via perguntas diretas):**

- **Provedores híbridos (decisão do usuário):** a chave Gemini do projeto tem **cota zero em `generateContent`** (`429` com `quota_limit_value: "0"`, todos os modelos, `v1` e `v1beta` — ausência de cota no projeto GCP, não excesso de uso), mas `embedContent` funciona. Por isso:
  - **LLM:** OpenRouter, modelo `nvidia/nemotron-3-ultra-550b-a55b:free` (`OPENROUTER_API_KEY` / `OPENROUTER_MODELO_LLM`). Escolhido pelo usuário no tier gratuito. Verificado: aceita `response_format: json_schema` (é o que o `generateObject` envia), tem reasoning embutido (deixado no padrão do modelo, por decisão do usuário), custo 0. **Limite: 50 requisições/dia por chave** em modelos `:free`.
  - **Embeddings:** `gemini-embedding-001` truncado em 768-D (`GEMINI_MODELO_EMBEDDING`). A OpenRouter não oferece embedding gratuito, e trocar exigiria reindexar a base — mantido no Gemini. O truncamento preserva a coluna `vector(768)` e o índice HNSW sem migration.
  - Os modelos do doc original (`gemini-1.5-flash`, `text-embedding-004`) **não existem mais na API do Google**.
- **Contexto atual** vem da **última predição persistida**, nunca de recálculo: o z-score de carteira depende de toda a carteira, então recalcular uma entidade isolada seria caro e inconsistente. Sem predição → 422.
- **Nomes de rota em português**, acompanhando `/api/motor/*` e `/api/ingestao/*`, divergindo da letra do `docs/instructions.md` (doc atualizado).
- **Texto canônico do perfil** (`lib/ia/descricao.ts`) é compartilhado entre indexação e consulta — essa simetria é o que faz a similaridade funcionar. Ele omite nome do cliente e valores em reais de propósito: o que deve aproximar dois casos é o padrão de comportamento, não quem é o cliente. **Alterar o formato exige reindexar a base.**
- **Embeddings gravados normalizados** (norma 1). Indiferente para cosseno, mas deixa aberta a troca futura para produto interno (`<#>`), mais barato.

**Validação executada (Task 4.2, dados reais do projeto seed):**

- 3 casos indexados via `POST /api/inteligencia/feedback` (dados fictícios de MVP, autorizados pelo usuário). Vetores conferidos no banco: **768 dimensões, norma 1.0000**.
- Busca com o embedding de um caso contra ele mesmo: **similaridade 1.0000 exata** (prova de que normalização e cosseno estão corretos).
- Ranking decrescente correto (0.8946 / 0.8721), exclusão da própria entidade e limiar mínimo funcionando.
- Observação honesta: com textos tão estruturados, as similaridades se concentram em faixa alta (>0.85 entre casos de perfis bem diferentes). O piso padrão de `0.5` (`PADRAO_SIMILARIDADE_MINIMA`) é, na prática, permissivo demais para discriminar — **recalibrar quando a base tiver volume real**.
- **Task 4.3 contra o LLM real (OpenRouter):** `POST /api/inteligencia/analisar` para o C004 — HTTP 200 em 30.6s, diagnóstico gravado em `diagnosticos_ia` com vínculo à predição e casos do RAG. O modelo citou os pesos/contribuições exatos de `motivos_predicao` (5/2/2 → +350/+140/+140) e o `valor_impacto` real (R$ 500); trouxe 1 caso lookalike (os 2 do próprio C004 foram corretamente excluídos) e deixou placeholders em vez de inventar nomes de contatos. Segundo teste com C001 (saudável, cobertura 0): 22.2s, o modelo interpretou corretamente que score 0 com cobertura 0 é cegueira, não saúde.
- Defeito corrigido após o teste: o modelo numera os itens do plano (`"1. Ligar..."`) mesmo instruído a não fazê-lo. Corrigido com regra no prompt **e** sanitização determinística (`normalizarDiagnostico` em `lib/ia/analisar.ts`, limitada a 1–2 dígitos para não mutilar datas), testada em 8 casos de borda.
- Erros 400/404 conferidos.

**Assistente conversacional (chat "Sinalys" do painel) — adicionado ao Módulo 4 a pedido do usuário:**

- `POST /api/inteligencia/chat` (`app/api/inteligencia/chat/route.ts`): streaming via AI SDK (`streamText` → `toUIMessageStreamResponse`), exige sessão (401 sem login), projeto resolvido pela sessão. Até 5 passos de ferramenta por turno; contexto limitado às últimas 20 mensagens.
- `lib/ia/chat/ferramentas.ts`: 4 ferramentas **somente leitura** (decisão do usuário) sobre os dados reais — `listar_fila_prioridade`, `resumo_carteira`, `detalhar_cliente` (sinais do motor + último diagnóstico de IA + últimos contatos + desfechos) e `buscar_casos_similares` (Task 4.2). Reaproveitam `lib/painel/*` da sessão paralela; não gravam nada.
- `lib/ia/chat/prompt.ts`: persona prescritiva, explica o funcionamento do motor, recebe a **tela atual** (caminho + cliente em foco) para "este cliente" resolver sozinho, escopo fechado ao domínio.
- Front: `components/assistente/AssistenteWidget.tsx` reescrito sobre `useChat` (`@ai-sdk/react@4`, pareado com `ai@7`); partes de ferramenta aparecem como status ("Abrindo o raio-x do cliente…"); botão de parar e de nova conversa; saudação com o nome real do usuário; erros do provedor chegam legíveis. `sugestoes.ts` traz sugestões de prompt **contextuais por tela** (decisão do usuário); `TextoFormatado.tsx` renderiza o subconjunto de Markdown permitido sem dependência nova. Os `AssistantCard` já existentes continuam preenchendo o rascunho ao abrir.
- **Modelo do chat:** `nvidia/nemotron-3-super-120b-a12b:free` (`OPENROUTER_MODELO_CHAT`), escolhido por medição: tool calling em streaming em **6.6s** por turno, contra 35s do ultra (mantido no diagnóstico) e 137s do "3.5-lightning". Turnos com ferramentas encadeadas medem 10–15s.
- **Validado pela rota real, com sessão real** (usuário temporário criado via admin API e apagado ao final): "por onde começo" → encadeou fila + raio-x, resumiu o diagnóstico salvo e citou um contato real registrado; "casos parecidos com este cliente" no detalhe do C001 → resolveu o cliente pela tela e usou a busca vetorial; pergunta fora do domínio → recusa padrão (após endurecer a regra: a 1ª versão respondeu "Canberra").
- Limitações observadas do modelo gratuito: numa rodada apresentou o Score de Urgência (adimensional) como "R$ 35 mil" e transcreveu "15 min" como "15 h" — regras adicionadas ao prompt, mas o texto do assistente é apoio, não fonte de verdade. O upstream gratuito também devolveu "Service temporarily overloaded" uma vez; o erro chega legível ao chat e basta reenviar.
- Histórico do chat vive só no estado do componente (some ao recarregar a página) — decisão consciente: o assistente é apoio, o registro fica no histórico de contatos.

**Aba "Plano de ação" do detalhe do cliente ligada à Task 4.3 (a pedido do usuário):**

- `components/clientes/ClienteTabs.tsx`: abas **Histórico** e **Relacionamento** removidas (junto com `contatosChave` — contatos fictícios em hardcode — e o botão "Ver histórico" da visão geral, que apontava para a aba removida). Restam Visão geral, Sinais de risco e Plano de ação.
- Plano de ação: botão **"Analisar cliente"** (ou "Reanalisar", quando já existe diagnóstico) chama `POST /api/inteligencia/analisar` com o `id_externo` do cliente, mostra estado de progresso (a análise leva 20–30s), exibe Diagnóstico + "O que o histórico diz" + checklist de ações imediatas, e faz `router.refresh()` para o restante da tela refletir o diagnóstico persistido. Erros da rota (422 sem predição, cota, upstream) aparecem inline.
- `lib/painel/detalhe.ts` passou a expor `analiseLookalike` (antes só o `diagnostico_principal` chegava ao front).
- Não validado visualmente no navegador (página exige sessão); a rota chamada pelo botão foi validada com sessão real na etapa anterior.

**Pendências registradas durante a execução do Módulo 4:**

- ⚠️ **Limite de 50 requisições/dia no LLM gratuito — compartilhado entre diagnóstico e chat.** Cada turno do chat gasta 2–3 requisições (uma por passo de ferramenta). Na validação desta sessão foram usadas ~25. Suficiente para uso manual leve, mas o Vercel Cron do 5.4 (varredura diária da carteira) esgota isso rápido em bases reais. Ao implementar o 5.4, analisar só entidades acima de um limiar de urgência, ou trocar `OPENROUTER_MODELO_LLM` por um modelo pago (sem mudar código).
- ⚠️ **Qualidade do modelo gratuito — imprecisão observada:** no teste com o C001, o modelo afirmou que os dois casos históricos do C004 "apresentaram ausência de dados", mas o segundo caso tinha dados (inadimplência, SLA 71%). Generalizou além do contexto, apesar da proibição no prompt. Regras foram reforçadas no `PROMPT_SISTEMA`; ainda assim, **o texto de `analise_lookalike` deve ser lido como sugestão, não como fato** — o painel do 5.2 deve exibir os casos originais ao lado.
- ⚠️ **`OPENROUTER_API_KEY` só está em `.env.local`.** Precisa ser cadastrada na Vercel antes do deploy (o MCP da Vercel devolve `403` no scope `hugo-almeidas-projects-6d9d1f54` — token precisa ser reautenticado). `OPENROUTER_MODELO_LLM` e `GEMINI_MODELO_EMBEDDING` têm default no código. A chave OpenRouter foi colada em chat pelo usuário, que disse que vai trocá-la.
- ⚠️ **Latência do LLM: 22–31s por análise.** Dentro do `maxDuration = 60` da rota, mas acima do que um painel tolera de forma síncrona. O 5.2 deve ler o último diagnóstico persistido em `diagnosticos_ia` e só disparar uma nova análise sob demanda.
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

- [X] **Task 5.1:** Desenvolver o painel no frontend Next.js exibindo a fila de priorização de Customer Success ordenada por urgência. _(Home `/` e `/clientes` lêem dados reais via `lib/painel/servidor.ts#carregarPainel` (Server Components chamam a lib direto, sem HTTP; memoizado por request com `react/cache`). KPIs reais, filtro de segmento dinâmico, estados vazios para "sem modelo ativo"/"sem predição".)_
- [X] **Task 5.2:** Criar visualização detalhada por cliente contendo o raio-x atual, evidências de risco e a recomendação prescritiva da IA. _(`/clientes/[id]` aceita `id_externo` ou UUID; `lib/painel/detalhe.ts` monta evidências dos motivos acionados (severidade pela intensidade normalizada), evolução do score (última predição de cada mês, 12 meses), histórico = contatos + eventos de desfecho + último diagnóstico, plano de ação = `diagnosticos_ia.plano_acao_imediato` (ou ações padrão se ainda não houver diagnóstico), responsável = autor do contato mais recente. **Falta na tela:** botão "Gerar diagnóstico" chamando `POST /api/inteligencia/analisar` — hoje o diagnóstico só aparece se já existir no banco.)_
- [X] **Task 5.3:** Implementar o fluxo de feedback humano (registro de desfecho e ação realizada) para retroalimentar o banco vetorial. _(Menu "..." → "Marcar como resolvido" abre `MarcarResolvidoModal` (ação realizada obrigatória) → `POST /api/inteligencia/feedback` com `desfecho: "recuperado"`. "Registrar contato" grava em `contatos`; "Silenciar alertas (30 dias)" chama `/api/alertas/silenciar`. Todas fazem `router.refresh()` para atualizar KPIs/fila. **Falta:** registrar desfecho `cancelado` pela UI (só via API) e "Agendar reunião" (desabilitado, sem backend).)_
- [ ] **Task 5.4:** Configurar o Vercel Cron Job para varredura diária automatizada de riscos e geração proativa de alertas.

**API do painel (backend da home "Sua fila do dia"; o front consome a mesma lib via Server Components e as rotas HTTP nas ações do cliente):**

- `GET /api/painel/fila` — clientes em `critico|alerta` (query `faixas=critico,alerta|todas`), sem silenciamento vigente (`incluir_silenciados=1` para ver), filtro `segmento=`, ordenados por Score de Urgência. Cada item já vem na forma do `Cliente` do mock (`id`=id_externo, `nome`, `segmento`/`porte`/`tipo` de `entidades.atributos`, `mrr`=valor_impacto, `receitaAnualRisco`=MRR×12×score/100, `scoreRisco` 0-100, `faixaRisco`, `tendenciaScore` comparando com a penúltima predição (±3 pts), `sinais`/`resumoAlerta` dos top-3 motivos acionados com rótulo da métrica, `variacaoMrr` das 2 últimas observações de `receita_mensal`) mais `entidadeId`, `cobertura`, `scoreUrgencia`, `silenciadoAte`. Devolve também `segmentos` (lista dinâmica para o filtro) e `sem_predicao`.
- `GET /api/painel/clientes` — carteira inteira + `resumo_carteira` por faixa (tela /clientes).
- `GET /api/painel/kpis` — `receitaEmRiscoAno`, `clientesEmAlerta`, `totalCarteira`, `antecedenciaMedia/Mediana/MaximaMeses` (início da sequência contínua de crítico/alerta antes de cada evento-alvo; `null` sem desfechos), `desfechosAntecipados`, `clientesContatados7d`.
- `POST/GET /api/contatos` — backend do `RegistrarContatoModal` (aceita `tipo` por código ou rótulo do modal). Tabela nova `contatos`.
- `POST/DELETE /api/alertas/silenciar` — "Silenciar alertas" por `dias` (default 30, máx 365) / reativar. Tabela nova `silenciamentos_alerta`.
- "Marcar como resolvido" → usar `POST /api/inteligencia/feedback` com `desfecho: "recuperado"` (exige `acao_realizada`; o botão do front precisa de um modal para isso).
- Código em `lib/painel/*` (`clientes.ts` monta a lista uma vez e é reaproveitado por fila/clientes/kpis), `lib/contatos/constantes.ts`. Migration `modulo5_contatos_silenciamentos` refletida em `docs/modelagem.sql`.
- **Tenant:** `lib/painel/projeto.ts#resolverProjetoId` resolve `projeto_id` por sessão (`app_metadata`) → parâmetro explícito → `DEFAULT_PROJETO_ID`. Aplicado nas rotas do painel, `motor/*` e `inteligencia/*`; **`ingestao/*` e `definicoes-metricas` ainda usam só o fallback**.
- Validado contra o projeto seed (2 entidades): fila/kpis/clientes, contato (201/400/404), silenciar tira da fila e zera KPIs de alerta, DELETE reativa. Contato de teste em `C004` mantido na base (fictícia).
- ⚠️ Pendências: RLS continua desabilitado nas 2 tabelas novas (mesma decisão das outras 14); "Agendar reunião" segue sem backend (sem definição de produto — pode virar um `contatos.tipo=reuniao_*` com `proximo_passo_em`); as duas tabelas novas não têm FK para `auth.users` de propósito.
- 🎨 **Telas ainda em mock** (`lib/mock-data.ts`): `/playbook`, `/relatorios`, `/configuracoes` (perfil/equipe/pesos do modelo) e o histórico em `/ingestao` (`HistoricoIngestoes`). Os tipos `FaixaRisco`/`Evidencia`/`EventoHistorico`/`PontoScore` de `mock-data.ts` continuam sendo a fonte dos tipos do painel.
- 🐛 **[Corrigido] Datas só com dia recuavam 1 dia** (`lib/format.ts`): `new Date("2024-03-01")` é UTC e no fuso do Brasil virava 29/02. `parseData()` trata `YYYY-MM-DD` como data local; todos os formatadores passaram a usá-lo.
