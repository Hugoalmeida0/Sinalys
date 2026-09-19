# ⚙️ Motor Matemático de Predição (Risk & Urgency Engine)

O motor matemático é o núcleo do sistema agnóstico. Sua função é transformar dados de origens, tipos e grandezas completamente diferentes (dias, reais, percentuais, quantidades) em uma única **Fila de Priorização de Atendimento**.

O cálculo é executado em quatro etapas sequenciais:

### 1. Normalização de Grandezas (Z-Score e Tendência)
Como não é possível cruzar "dias de atraso" com "percentual de uso" diretamente, o motor normaliza todos os valores gravados na tabela de `observacoes` para uma escala de alerta de 0 a 100.
*   **Comparativo de Carteira (Desvio Padrão):** O sistema calcula a média geral dos clientes para uma métrica. Se o tempo médio de suporte da base é de 10h e um cliente específico registra 25h, o alerta sobe proporcionalmente à distância dessa média.
*   **Comparativo Histórico (Média Móvel):** O motor compara o cliente com o seu próprio histórico. Uma queda abrupta de 90% para 40% no uso da plataforma nos últimos 30 dias aciona um gatilho de risco mais agudo do que o de um cliente que historicamente sempre manteve 40% de uso.
*   **Tratamento de Omissão (Null como Comportamento):** Campos vazios em métricas de engajamento (como o silêncio em uma pesquisa de NPS) são processados como sinais de distanciamento, recebendo uma pontuação de risco e não apenas um zero matemático.

### 2. Atribuição de Pesos (Modelagem)
Com todas as métricas niveladas, o sistema consulta a tabela de `regras_modelo`. Cada indicador é multiplicado pelo peso definido pelo usuário na parametrização (ou sugerido pela IA com base na análise de perdas passadas).
*   *Exemplo:* O Risco de Atraso de Pagamento pode ter peso 2, enquanto a Queda Severa de Uso do Sistema recebe peso 5.

### 3. Cálculo do Score de Risco (Probabilidade de Churn)
O motor consolida os alertas ponderados para gerar uma probabilidade matemática, que é salva na tabela `predicoes`.
*   **Lógica:** `Risco Base = Σ (Valor Normalizado × Peso da Métrica)`
*   **Resultado:** Um termômetro consolidado de 0 a 100 para o cliente, indicando o quão próximo ele está do padrão de cancelamento.

### 4. Matriz de Urgência (Impacto de Negócio)
Um risco de 90% em um contrato de R$ 500 exige menos urgência do que um risco de 65% em um contrato de R$ 15.000. Para montar a fila de atendimento real, o motor cruza o risco matemático com o impacto financeiro:
*   **Cálculo Final:** `Score de Urgência = Score de Risco × Receita Mensal do Cliente`

O painel de Customer Success é ordenado exclusivamente pelo **Score de Urgência**. Isso garante que o analista saiba exatamente com quem falar primeiro, focando tempo e energia nos clientes que representam a maior ameaça à receita da empresa.