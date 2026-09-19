
# 📋 Task List — MVP Agnóstico de Prevenção de Churn

Este documento define as tarefas de desenvolvimento macro e genéricas necessárias para estruturar o MVP da plataforma, mantendo o ecossistema agnóstico, com persistência relacional/vetorial e motor de IA integrado.

---

## 🚀 Módulo 1: Infraestrutura e Configuração Base

- [x] **Task 1.1:** Inicializar o projeto unificado em Next.js (App Router) configurado para deploy serverless na Vercel. _(deploy em produção ativo em sinalys.vercel.app)_
- [x] **Task 1.2:** Executar o script SQL (`modelagem.sql`) no Supabase para provisionar o banco relacional e habilitar a extensão `pgvector`.
- [x] **Task 1.3:** Configurar as variáveis de ambiente centrais (`.env.local` e painel Vercel) para conexão com Supabase e chaves de IA.

## 📥 Módulo 2: Ingestão e Mapeamento Agnóstico

- [ ] **Task 2.1:** Criar componente e rota de upload de arquivos (Excel/CSV) para registrar as execuções de ingestão.
- [ ] **Task 2.2:** Desenvolver a interface e endpoint de mapeamento dinâmico (De-Para), permitindo ao usuário associar colunas arbitrárias às definições de métricas e entidades.
- [ ] **Task 2.3:** Implementar o parser universal que normaliza e persiste os dados de diferentes fontes na tabela padronizada de observações.

## ⚙️ Módulo 3: Motor Matemático de Risco e Urgência

- [ ] **Task 3.1:** Implementar a rotina de normalização de métricas (cálculo de desvio padrão/Z-score e média móvel temporal).
- [ ] **Task 3.2:** Desenvolver a lógica de cálculo do Score de Risco baseada na aplicação dos pesos configurados nas regras do modelo.
- [ ] **Task 3.3:** Criar o cálculo da Matriz de Urgência cruzando a probabilidade de risco com o impacto financeiro (receita) para gerar a ordenação da fila.

## 🧠 Módulo 4: Inteligência, RAG e Orquestração de IA

- [ ] **Task 4.1:** Configurar a integração com a API do Gemini utilizando o Vercel AI SDK (`@ai-sdk/google`).
- [ ] **Task 4.2:** Implementar a busca semântica por similaridade via `pgvector` no Supabase para resgatar o histórico de desfechos (lookalike).
- [ ] **Task 4.3:** Criar a rota de orquestração que consolida o contexto atual e histórico para gerar o diagnóstico e plano de ação estruturado (JSON).

## 🖥️ Módulo 5: Painel de Atendimento e Feedback Loop

- [ ] **Task 5.1:** Desenvolver o painel no frontend Next.js exibindo a fila de priorização de Customer Success ordenada por urgência.
- [ ] **Task 5.2:** Criar visualização detalhada por cliente contendo o raio-x atual, evidências de risco e a recomendação prescritiva da IA.
- [ ] **Task 5.3:** Implementar o fluxo de feedback humano (registro de desfecho e ação realizada) para retroalimentar o banco vetorial.
- [ ] **Task 5.4:** Configurar o Vercel Cron Job para varredura diária automatizada de riscos e geração proativa de alertas.
