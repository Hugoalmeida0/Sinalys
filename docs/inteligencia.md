# 🧠 Bloco de Inteligência e Contexto (IA e RAG)

O Bloco de Inteligência é a camada que transforma dados frios e cálculos matemáticos em estratégias acionáveis para o time de Customer Success. Ele utiliza Inteligência Artificial generativa e memória de longo prazo para explicar o "porquê" de um risco e indicar exatamente "o que fazer".

O fluxo de inteligência opera em quatro etapas integradas:

### 1. Indexação e Memória Histórica (RAG com Banco Vetorial)
O sistema não analisa o cliente atual isoladamente. Cada desfecho passado da empresa (seja um cancelamento ou uma recuperação bem-sucedida) é processado, transformado em representações numéricas (embeddings) e armazenado no banco de dados vetorial.
* **Consulta por Similaridade:** Quando um cliente entra na zona de alerta, o sistema não busca apenas por regras estáticas, mas faz uma pergunta semântica à base: *"Quais foram os clientes mais parecidos com este no histórico da empresa e quais foram os desfechos?"*.
* **Histórico de Ações:** O modelo recupera não apenas quem cancelou, mas qual estratégia o time de CS adotou na época que funcionou ou falhou.

### 2. Cruzamento de Contextos (Raio-X + Lookalike)
O motor de IA recebe simultaneamente dois blocos de informação estruturada:
* **Contexto Atual:** Os desvios detectados pelo motor matemático (ex: queda drástica de uso, atrasos de pagamento e ausência em reuniões).
* **Contexto Histórico (Lookalike):** Os casos passados mais similares encontrados pelo banco vetorial (ex: *"Este comportamento é 90% idêntico ao do Cliente Y, que cancelou no trimestre passado após falhar nas reuniões de alinhamento"*).

### 3. O Analista Virtual (Geração de Insights com LLM)
Utilizando um modelo de linguagem via OpenRouter (os embeddings da memória vêm do Gemini), o sistema atua como um gestor sênior de Customer Success. A IA é **somente leitura**: recebe o score e os motivos já calculados pelo motor determinístico, não tem acesso ao banco e não altera o score. Se a LLM falhar, um diagnóstico de contingência é montado apenas com regras.
* A IA cruza a severidade do risco financeiro com os padrões do passado para redigir um **Diagnóstico de Risco** claro e direto.
* Em vez de alertas genéricos, o motor gera um **Plano de Ação Imediato** prescritivo (ex: *"Ligar para o decisor e agendar um re-onboarding focado no módulo crítico"*).

### 4. Ciclo de Aprendizado Contínuo (Feedback Loop)
A inteligência do sistema evolui a cada interação humana:
* Quando o analista de Customer Success executa a recomendação e registra o resultado no sistema (se o cliente foi salvo ou cancelado), esse novo desfecho é vetorizado e inserido na base histórica.
* Com isso, o sistema aprende com os próprios erros e acertos, garantindo que as recomendações futuras sejam cada vez mais precisas e alinhadas à realidade da operação.