# Sinalys

Plataforma de Customer Success para antecipar churn. A Sinalys transforma observações operacionais em score de risco, prioriza a carteira pelo impacto financeiro e usa IA com memória de casos anteriores para explicar o risco e recomendar ações.

O projeto é full-stack em Next.js 16 (App Router): páginas, componentes e Route Handlers vivem no mesmo repositório; Supabase fornece autenticação, PostgreSQL, Storage e `pgvector`; OpenRouter gera análises e conversas; Gemini gera embeddings.

## O que está disponível hoje

Legenda de status:

- **Operacional:** lê ou grava dados reais no Supabase.
- **Local:** funciona na interface, mas não persiste o resultado.
- **Demonstrativo:** está visível, porém o controle ainda não executa a ação anunciada.
- **Oculto:** existe no código, mas a feature flag atual redireciona a página para o Início.

| Funcionalidade | Onde testar | Status | O que é possível validar |
| --- | --- | --- | --- |
| Login e logout | `/login`; depois use **Sair** no topo ou menu móvel | Operacional | Login por e-mail e senha com Supabase Auth, sessão por cookie e proteção das páginas internas. |
| Painel e fila do dia | `/` | Operacional | KPIs de receita salva/em risco, clientes em alerta, antecedência, contatos recentes e fila ordenada por prioridade. Ao entrar, o motor é recalculado antes de atualizar o painel. |
| Carteira de clientes | `/clientes` | Operacional + Local | Resumo por faixa, busca, filtros por situação/risco/segmento, ordenação e paginação sobre dados reais. Os filtros são executados no navegador. |
| Detalhe do cliente | `/clientes` → clique em um cliente | Operacional | MRR, receita em risco, score, evolução, sinais, explicação, plano de ação e dados cadastrais. |
| Simulador de cenários | detalhe do cliente → **Simulador** | Local | Reduzir sinais individualmente, comparar score/receita/prioridade e copiar a frase do cenário. A simulação não altera dados nem o score persistido. |
| Diagnóstico e plano por IA | detalhe do cliente → **Plano de ação** → **Analisar cliente** | Operacional | Geração ou reanálise do diagnóstico, comparação com casos semelhantes e plano imediato. Marcar itens como concluídos é apenas local. |
| Assistente Sinalys | botão flutuante em qualquer página interna ou cards “Pergunte à Sinalys” | Operacional | Chat com contexto da tela e ferramentas somente leitura para fila, carteira, raio-X de cliente e casos semelhantes. |
| Registrar contato | cliente → **Ações** → **Registrar contato** | Operacional | Tipo, data, resumo, próximo passo e data prevista; o contato entra no histórico usado pelo painel e pelo assistente. |
| Registrar recuperação | cliente → menu `…` → **Marcar como resolvido**, ou `/recuperacao` | Operacional | Grava desfecho recuperado e indexa o caso para recomendações futuras. |
| Registrar cancelamento | cliente → menu `…` → **Marcar como cancelado** | Operacional | Grava motivo, detalhe e ação já tentada; o cliente passa a aparecer na campanha de recuperação. |
| Silenciar alertas | cliente → menu `…` → **Silenciar alertas (30 dias)** | Operacional | Retira temporariamente o cliente da fila padrão, sem apagar seu risco. |
| Campanha de recuperação | `/recuperacao` | Operacional | Causas de cancelamento, clientes cancelados, análise de perfil, plano de reativação e registro de recuperação. |
| Health Score compartilhável | detalhe do cliente → **Compartilhar com o cliente** | Operacional | Selecionar destaques positivos e benefícios, informar um link de agenda e copiar o link público. Abra-o sem uma sessão autenticada; a página não exibe risco, score ou MRR. |
| Pedido de call pelo cliente | página pública `/health/[token]` | Operacional | Com link de agenda, abre o serviço externo; sem link, registra no histórico um pedido de contato com nome, horário e mensagem. |
| Calibração do modelo | `/configuracoes` → **Modelo de risco** | Operacional | Alterar pesos, adicionar um sinal, escolher comparação com carteira ou histórico e configurar omissão. Salvar dispara o recálculo das predições. |
| Preferências, usuários e integrações | `/configuracoes` | Demonstrativo | Abas, toggles, listas e botões são uma prévia visual; somente a aba **Modelo de risco** persiste mudanças. |
| Ingestão de Excel/CSV | `/ingestao` | Oculto | Wizard e APIs existem, mas `EXIBIR_INGESTAO` está `false`; a URL redireciona para `/`. |
| Playbook e relatórios | `/playbook` e `/relatorios` | Oculto | Telas baseadas em mocks existem, mas as flags estão desativadas e as URLs redirecionam para `/`. |

## Roteiro recomendado de teste

Antes do roteiro, o projeto precisa ter pelo menos um usuário no Supabase Auth, um projeto, um modelo ativo com regras, entidades, observações e predições. As credenciais preenchidas por padrão na tela de login são apenas uma conveniência da interface: elas só funcionarão se esse usuário tiver sido criado no Supabase usado pelo ambiente.

1. Acesse `/login`, autentique-se e aguarde “Calculando a fila de hoje…”.
2. Em `/`, confira os KPIs e abra um cliente da fila. O link **Ver fila completa** leva à carteira já ordenada por prioridade.
3. Em `/clientes`, teste busca, filtros e ordenações; abra um cliente com sinais de risco.
4. No detalhe, compare **Visão geral**, **Sinais de risco** e **Simulador**.
5. Em **Plano de ação**, gere uma análise. Para validar lookalikes de verdade, a base precisa ter casos históricos indexados.
6. Use **Ações → Registrar contato** e confirme depois, no assistente, perguntando “Já houve contato recente com este cliente?”.
7. Use **Compartilhar com o cliente**, escolha o conteúdo, salve e abra a prévia pública em uma janela anônima.
8. Registre um cancelamento e confirme sua aparição em `/recuperacao`; nessa página, gere um plano de reativação.
9. Em `/configuracoes` → **Modelo de risco**, altere um peso ou adicione um sinal. A operação salva e recalcula a carteira.

Para testar a IA, configure as chaves de OpenRouter e Gemini. Sem casos históricos, a análise ainda pode ser gerada, mas deve informar que não encontrou comparações reais. Para testar o Health Score, escolha um cliente que tenha `token_compartilhamento` válido.

## Controles visíveis que ainda não estão implementados

Os seguintes elementos não devem ser usados como critério de aceite funcional neste momento:

- busca global e sino de notificações no topo;
- botão central de ação rápida no menu móvel;
- “Esqueceu a senha?”;
- exportação da carteira;
- “Agendar reunião” no menu de ações;
- “Ver todos” no resumo de sinais;
- botão geral “Salvar alterações” de Configurações;
- edição de perfil, gestão de integrações/usuários e persistência das preferências de notificação.

## Como executar localmente

Requisitos: Node.js 20 ou superior, npm e um projeto Supabase preparado com o schema deste repositório.

```bash
npm install
npm run dev
```

Crie manualmente um `.env.local` na raiz — o repositório não contém `.env.example` — e abra [http://localhost:3000](http://localhost:3000).

### Variáveis de ambiente

```env
# Supabase: aplicação e autenticação
NEXT_PUBLIC_SUPABASE_URL="https://SEU_PROJETO.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sua_chave_publica"
# NEXT_PUBLIC_SUPABASE_ANON_KEY="alternativa_legada_a_publishable_key"
SUPABASE_SERVICE_ROLE_KEY="sua_service_role"

# Projeto usado quando o usuário não tem app_metadata.projeto_id
DEFAULT_PROJETO_ID="uuid-do-projeto"

# IA generativa: diagnóstico e chat
OPENROUTER_API_KEY="sk-or-v1-..."
OPENROUTER_MODELO_LLM="nvidia/nemotron-3-ultra-550b-a55b:free"
OPENROUTER_MODELO_CHAT="nvidia/nemotron-3-super-120b-a12b:free"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Embeddings: lookalikes e feedback
GOOGLE_GENERATIVE_AI_API_KEY="sua-chave-google-ai"
GEMINI_MODELO_EMBEDDING="gemini-embedding-001"

# Necessário quando a ingestão for habilitada
SUPABASE_STORAGE_BUCKET_INGESTAO="ingestao-raw"
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` é preferida; `NEXT_PUBLIC_SUPABASE_ANON_KEY` funciona como fallback. Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no navegador ou em variáveis `NEXT_PUBLIC_*`.

### Preparação do Supabase

Em um banco novo:

1. execute [`db/modelagem.sql`](db/modelagem.sql) para criar tabelas, índices, extensão vetorial e a função de similaridade;
2. execute [`db/rls.sql`](db/rls.sql) para habilitar RLS e as políticas atuais;
3. crie o bucket privado configurado em `SUPABASE_STORAGE_BUCKET_INGESTAO` se for habilitar ingestão;
4. crie um usuário em Supabase Auth;
5. informe o UUID do projeto em `app_metadata.projeto_id` do usuário ou configure `DEFAULT_PROJETO_ID`.

Os SQLs foram escritos para inicialização de um banco novo e não são migrações idempotentes.

## Como o sistema funciona

O fluxo principal é:

1. observações numéricas alimentam regras do modelo;
2. o motor normaliza cada sinal por comparação com a carteira (`zscore_carteira`) ou com o histórico do próprio cliente (`media_movel`);
3. pesos consolidam os sinais em um score de risco de 0 a 100, com faixa saudável, atenção, alerta ou crítica;
4. risco e impacto relativo da receita formam o score de prioridade mostrado na fila;
5. a IA recebe a predição, seus motivos e casos historicamente semelhantes para produzir diagnóstico e plano;
6. contatos, recuperações e cancelamentos fecham o ciclo operacional; recuperações e cancelamentos com uma ação informada viram memória vetorial para análises futuras.

O diagrama completo, os limites entre frontend/API/domínio e o mapa das tabelas e endpoints estão em [`docs/fluxograma-projeto-mermaid.md`](docs/fluxograma-projeto-mermaid.md).

## Estrutura do repositório

```text
app/
  (app)/                 páginas autenticadas
  api/                   Route Handlers da aplicação
  health/[token]/        página pública compartilhável
  login/                 autenticação
components/              componentes React por feature
hooks/                   estado e clientes HTTP da interface
lib/
  motor/                 normalização, score, faixas e prioridade
  painel/                consultas e montagem dos view models
  ia/                    LLM, embeddings, RAG, prompts e chat tools
  ingestao/              leitura, mapeamento e normalização de planilhas
  health/                configuração e leitura da página pública
  supabase/              clientes browser/server/admin e proxy de sessão
db/                      schema e políticas RLS
docs/                    documentação funcional e técnica
public/                  imagens e assets
proxy.ts                 renovação de sessão e proteção de páginas
```

A dependência segue o sentido `app → components/hooks → lib`. Route Handlers devem validar a requisição e delegar regras para `lib/`; código de domínio não deve depender de componentes React.

## Scripts

| Comando | Uso |
| --- | --- |
| `npm run dev` | inicia o servidor de desenvolvimento |
| `npm run build` | gera o build de produção |
| `npm start` | executa o build de produção |
| `npm run lint` | executa o ESLint |

## Documentação complementar

- [`docs/fluxograma-projeto-mermaid.md`](docs/fluxograma-projeto-mermaid.md) — arquitetura e fluxos técnicos atuais
- [`docs/setup.md`](docs/setup.md) — ingestão e mapeamento agnóstico
- [`docs/motor-matematico.md`](docs/motor-matematico.md) — cálculo de risco e prioridade
- [`docs/inteligencia.md`](docs/inteligencia.md) — RAG, diagnóstico e feedback
