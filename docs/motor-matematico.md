# ⚙️ Motor Matemático de Predição (Risk & Urgency Engine)

O motor matemático é o núcleo do sistema agnóstico. Sua função é transformar dados de origens, tipos e grandezas completamente diferentes (dias, reais, percentuais, quantidades) em uma única **Fila de Priorização de Atendimento**.

O cálculo é executado em quatro etapas sequenciais:

### 1. Normalização de Grandezas (Z-Score e Tendência)
Como não é possível cruzar "dias de atraso" com "percentual de uso" diretamente, o motor normaliza todos os valores gravados na tabela de `observacoes` para uma escala de alerta de 0 a 100.
*   **Comparativo de Carteira (Desvio Padrão):** O sistema calcula a média geral dos clientes para uma métrica. Se o tempo médio de suporte da base é de 10h e um cliente específico registra 25h, o alerta sobe proporcionalmente à distância dessa média. O valor comparado é a **média das últimas N observações** da entidade (N = 3 por padrão, `janela_observacoes` na regra), para que um único período atípico — um percentual calculado sobre um chamado, um atraso isolado — não sature o sinal sozinho.
*   **Comparativo Histórico (Média Móvel):** O motor compara o cliente com o seu próprio histórico. Uma queda abrupta de 90% para 40% no uso da plataforma nos últimos 30 dias aciona um gatilho de risco mais agudo do que o de um cliente que historicamente sempre manteve 40% de uso.
*   **Tratamento de Omissão (Null como Comportamento):** Campos vazios em métricas de engajamento (como o silêncio em uma pesquisa de NPS) podem ser processados como sinais de distanciamento, recebendo a pontuação definida em `pontuacao_omissao` na regra. Sem essa configuração a ausência **não pontua**: a regra fica "não avaliável" e reduz a `cobertura` da predição — um cliente sem chamado no mês não é um cliente em risco.
*   **Data de referência:** por padrão é a **última observação do projeto**, não o relógio. Com dados mensais que terminam em junho e o relógio em setembro, "agora" deixaria a janela recente vazia e mataria toda regra de média móvel.
*   **Sinal acionado:** um motivo só conta como "acionado" (evidência mostrada ao analista) quando o desvio é de pelo menos 1 desvio-padrão (`LIMIAR_Z_ACIONADO`). Abaixo disso ele entra no score, mas não vira alerta.

### 2. Atribuição de Pesos (Modelagem)
Com todas as métricas niveladas, o sistema consulta a tabela de `regras_modelo`. Cada indicador é multiplicado pelo peso definido pelo usuário na parametrização (ou sugerido pela IA com base na análise de perdas passadas).
*   *Exemplo:* O Risco de Atraso de Pagamento pode ter peso 2, enquanto a Queda Severa de Uso do Sistema recebe peso 5.

### 3. Cálculo do Score de Risco (Probabilidade de Churn)
O motor consolida os alertas ponderados para gerar uma probabilidade matemática, que é salva na tabela `predicoes`.
*   **Lógica:** `Risco Base = Σ (Valor Normalizado × Peso da Métrica)`
*   **Resultado:** Um termômetro consolidado de 0 a 100 para o cliente, indicando o quão próximo ele está do padrão de cancelamento.

### 4. Matriz de Urgência (Impacto de Negócio)
Um risco de 90% em um contrato de R$ 500 exige menos urgência do que um risco de 65% em um contrato de R$ 15.000. Para montar a fila de atendimento real, o motor cruza o risco matemático com o impacto financeiro — mas sem deixar o dinheiro engolir o risco (o produto puro `risco × receita` colocava uma conta grande e saudável na frente de uma pequena em alerta):

*   **Impacto relativo:** `impacto_rel = ln(MRR / MRR_min) / ln(MRR_max / MRR_min)` — posição da receita na carteira **ativa**, em escala log, de 0 (menor conta) a 1 (maior). Sem receita mapeada usa o porte cadastral (Pequeno 0,25 / Médio 0,5 / Grande 0,75); nunca zero.
*   **Cálculo Final:** `Score de Prioridade = Score de Risco × (0,5 + impacto_rel)` — o impacto modula o risco entre 0,5× e 1,5×.

Assim uma conta grande com score médio passa uma pequena com score alto, mas uma grande saudável não passa ninguém em alerta. O Score de Risco e a faixa continuam puros (dinheiro é impacto, nunca risco); a prioridade é derivada ao montar a fila (`lib/motor/urgencia.ts`) e não é persistida.

O painel de Customer Success é ordenado pelo **Score de Prioridade**. Isso garante que o analista saiba exatamente com quem falar primeiro, focando tempo e energia nos clientes que representam a maior ameaça à receita da empresa.