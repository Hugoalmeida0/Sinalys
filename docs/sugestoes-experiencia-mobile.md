# Sugestões de experiência mobile — segunda rodada

Propostas novas para o Sinalys no celular.

O critério de entrada é estreito de propósito: **só entra o que a pessoa
percebe usando**. Nada de instrumentação, cobertura de teste ou refinamento de
estado vazio — coisas necessárias, mas que ninguém sente ao abrir o app. Cada
item abaixo muda algo que a pessoa vê, toca ou deixa de sofrer.

Ordenado por relação impacto/esforço.

---

## Já entregue

Fica registrado para não se repetir aqui nem se perder de vista:

| Entregue | O que mudou |
|---|---|
| PWA instalável | Abre em tela cheia, sem a barra do navegador |
| Tour da barra inferior | Cinco passos apresentando Início, Clientes, assistente, Recuperação e Mais |
| Esqueletos de navegação | Troca de tela deixou de parecer travamento |
| Contagem animada nos KPIs | Números sobem até o total, com entrada dos cards em cascata |
| Ditado por voz | Pergunta falada no assistente, em pt-BR |
| Compartilhamento nativo | Health Score vai direto para WhatsApp, e-mail ou AirDrop |
| Retorno tátil | Vibração curta ao confirmar ações |
| Streaming com Suspense | A fila do dia pinta antes dos KPIs |
| Mascote na barra inferior | O botão central abre o assistente |
| Aviso de implementação futura | Controles sem função deixaram de parecer quebrados |
| Card do assistente por último | No celular vem depois do conteúdo principal |
| Health Score para quem está logado | Link compartilhado deixou de expulsar quem tem conta |
| Sessão expirada sem laço | Cookie velho não prende mais ninguém na porta |

Da rodada anterior ficaram dois itens em aberto, que seguem valendo:
**"atualizado há X minutos"** no cabeçalho do painel e **um QR por cenário**,
apontando direto para um cliente crítico ou para o simulador.

---

## 1. Gráficos que respondem ao toque

**O que muda:** `ScoreEvolucaoChart` é um SVG estático. A pessoa toca num ponto
da curva para saber o valor daquele mês e não acontece nada — o gráfico parece
uma imagem colada na tela.

Um marcador seguindo o dedo, mostrando mês e score do ponto mais próximo.
Aproveita o SVG que já existe: é escuta de evento e posicionamento, não
biblioteca nova. Vale igualmente para as barras de `/relatorios`.

---

## 2. Transições entre telas

**O que muda:** hoje uma tela some e a outra aparece. Com a View Transitions
API, o título e o cartão do cliente podem se mover continuamente da lista para
o detalhe — a pessoa não perde o fio do que estava olhando.

É o recurso que mais aproxima a sensação de app nativo, e o Next 16 já dá
suporte. Custa pouco porque o trabalho é do navegador: marcar os elementos
correspondentes e deixar a transição acontecer. Degrada sozinho onde a API não
existe.

---

## 3. Atalhos no ícone do app

**O que muda:** com o PWA instalado, segurar o ícone hoje não oferece nada.
Podia abrir direto na fila do dia, na carteira ou já com o assistente aberto.

São algumas linhas no `app/manifest.ts` (campo `shortcuts`), e funcionam no
Android e no Windows. Transforma o ícone num ponto de partida em vez de uma
porta única.

---

## 4. Contador de alertas no ícone

**O que muda:** o número de clientes em alerta só aparece depois de abrir o app.
Com a Badging API, ele vira um distintivo no próprio ícone — a informação central
do produto passa a ser vista sem abrir nada.

É o tipo de detalhe que faz o app ocupar espaço mental entre uma sessão e outra.
Funciona no PWA instalado e some sozinho onde não há suporte.

---

## 5. Ouvir o diagnóstico da IA

**O que muda:** o assistente já aceita pergunta falada. Falta o outro lado: um
botão para ouvir a resposta e o plano de ação, via `SpeechSynthesis`, em pt-BR.

Quem está dirigindo para uma visita consegue ouvir o diagnóstico do cliente a
caminho — um uso que o produto simplesmente não atende hoje. E, numa
demonstração, é o recurso que provoca reação imediata.

---

## 6. O próximo passo vira lembrete

**O que muda:** ao registrar um contato, já se informa o próximo passo e a data.
Esse dado fica guardado e nada acontece com ele — a pessoa ainda precisa anotar
na agenda por fora, ou vai esquecer.

Um botão "adicionar à agenda" gerando um `.ics` (ou link do Google Calendar) com
o cliente, o passo combinado e a data fecha o ciclo dentro do app. No celular o
arquivo abre direto no calendário nativo.

---

## 7. Linha do tempo do cliente

**O que muda:** a tela do cliente mostra o estado de hoje — score, sinais,
plano. Não mostra a história: quando o score piorou, qual contato veio antes,
o que foi combinado da última vez.

Uma linha do tempo única, misturando mudanças de score e contatos registrados,
responde a pergunta que toda conversa com cliente começa: "onde paramos?". Os
dois conjuntos de dados já existem separados.

---

## 8. "Por que este score?" em português

**O que muda:** o score aparece como número e faixa. Os sinais aparecem como
chips. Falta a frase que liga uma coisa à outra — o raciocínio que justifica o
número.

Uma explicação curta e legível, montada a partir dos pesos do modelo que já
estão em `/configuracoes`: quais fatores puxaram o score para cima e quanto cada
um pesou. É o que transforma o número de veredito em argumento — e é exatamente
o que a pessoa precisa repetir ao falar com o cliente.

---

## 9. Copiar o resumo da fila

**O que muda:** para levar a fila do dia a uma reunião ou a um grupo de
WhatsApp, hoje é preciso ler da tela e digitar.

Um "copiar resumo" gerando texto pronto — os cinco clientes prioritários com
score e receita em risco — faz o produto conversar com o lugar onde o time já
se comunica, sem exigir que todos tenham acesso ao sistema.

---

## 10. Clientes que eu acompanho

**O que muda:** a fila é a mesma para todo mundo e muda todo dia. Não há como
alguém marcar os poucos clientes que está acompanhando de perto naquela semana.

Uma marcação pessoal, com um filtro rápido na carteira, dá ao produto uma
dimensão de uso individual em vez de painel coletivo. É o que faz a pessoa
voltar por vontade própria, e não só quando o alerta aparece.

---

## Ordem sugerida

Se houver espaço para três: **gráficos que respondem ao toque (1)**, porque
conserta algo que hoje frustra na primeira tentativa; **transições entre telas
(2)**, porque é o maior salto de percepção de qualidade pelo menor esforço; e
**"por que este score?" (8)**, porque é o que transforma o número no argumento
que a pessoa vai usar na conversa com o cliente.
