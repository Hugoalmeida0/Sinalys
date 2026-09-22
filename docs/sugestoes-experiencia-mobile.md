# Sugestões de experiência mobile

Ideias para quando alguém abre o Sinalys no próprio celular pela primeira vez —
numa apresentação, numa reunião comercial ou numa demonstração para cliente.

O critério aqui não é "o que falta no produto", e sim **o que faz diferença nos
primeiros noventa segundos de uso por uma pessoa que nunca viu o sistema**. Está
ordenado por relação impacto/esforço.

> Nada nesta lista está implementado. As que já foram aplicadas (skeletons de
> navegação, mascote na barra inferior, aviso de implementação futura) ficaram
> de fora de propósito.

---

## 1. Instalável na tela de início (PWA)

**Por que impressiona:** abre em tela cheia, sem a barra de URL do navegador.
O app deixa de parecer um site e passa a parecer um aplicativo — e ainda ganha
de volta os ~60px que a barra do Safari rouba, que foi justamente a origem do
bug do assistente.

Falta um `app/manifest.ts` (Next gera o `manifest.json`) com `display:
"standalone"`, `theme_color: "#0a2d6b"` e os ícones 192/512, mais um
`apple-touch-icon` em `public/`. O símbolo já existe em
`public/sinalys-symbol-color.png`. É a mudança de maior efeito visual pelo menor
esforço da lista.

**Bônus:** com o manifest no lugar, dá para trocar o QR por um que leve direto
ao app instalado, e a `theme_color` pinta a barra de status do Android de navy.

---

## 2. Tour de primeira visita — três toques

**Por que importa:** quem recebe o celular não sabe o que olhar. O silêncio
inicial é o maior inimigo de uma demonstração; a pessoa rola a tela sem rumo e
conclui que "é um dashboard".

Um overlay que aparece só na primeira sessão (`localStorage`) apontando para três
coisas, nessa ordem: o cliente no topo da fila, o botão do mascote, e a aba
"Simulador". Cada passo com uma frase, não um parágrafo. Sair a qualquer momento.

Um tour bem-feito converte "eu vi um dashboard" em "eu entendi o que ele faz".

---

## 3. Números que sobem ao aparecer

**Por que impressiona:** um KPI que conta de zero até `R$ 1,2 mi` em 600ms
comunica que o número foi *calculado*, não digitado. É o tipo de detalhe que a
banca não consegue nomear, mas sente.

Aplicável ao `KpiCard` e ao `StatsRow` do detalhe do cliente. Um hook pequeno com
`requestAnimationFrame` e easing de saída resolve. Respeitar
`prefers-reduced-motion`, como o CSS dos skeletons já faz.

Combina bem com uma entrada escalonada dos cards (cada um 40ms depois do
anterior), que faz o painel "montar" em vez de simplesmente surgir.

---

## 4. Pergunta por voz no assistente

**Por que impressiona:** é o recurso que mais provoca reação em demonstração no
celular. A pessoa fala "quais clientes estão em risco?" e vê a resposta ser
montada com as ferramentas sendo consultadas ao vivo.

A Web Speech API (`SpeechRecognition`) funciona no Chrome Android e no Safari iOS
com `pt-BR`. Entra como um botão de microfone ao lado do campo em
`AssistenteWidget`, preenchendo o mesmo `rascunho` que já existe. Precisa de
degradação limpa: onde a API não existe, o botão simplesmente não aparece.

---

## 5. Compartilhar de verdade, pelo menu do sistema

**Por que importa:** o `CompartilharHealthScore` já gera link e QR. Faltou o
último passo — `navigator.share()`, que abre a folha nativa do iOS/Android com
WhatsApp, e-mail e AirDrop.

Em demonstração, mandar o health score de um cliente para o próprio WhatsApp em
dois toques mostra que o produto se conecta ao mundo real. Sem a API disponível,
o botão volta a ser "copiar link".

---

## 6. Resposta tátil nas ações

**Por que importa:** a `Vibration API` (Android) num toque de 10ms ao confirmar
uma ação faz a interface parecer física. É uma linha de código por ação.

Vale nos pontos de confirmação — registrar contato, marcar resolvido — e no
envio de pergunta ao assistente. Não vale em navegação, onde vira ruído. No iOS a
API não existe e o retorno é silencioso, o que é aceitável.

---

## 7. Streaming granular em vez de tela inteira

**Por que importa:** hoje a página só aparece quando *todos* os dados chegam.
Os KPIs dependem de `calcularKpisPainel`, que é a consulta mais pesada do
dashboard, e a fila do dia fica esperando por ela sem necessidade.

Envolver cada bloco em seu próprio `<Suspense>` com o skeleton correspondente faz
a fila pintar primeiro e os KPIs preencherem depois. A percepção de velocidade
muda mais do que qualquer otimização de consulta — e os componentes de skeleton
já existem em `components/ui/Skeleton.tsx`.

O passo seguinte seria o Partial Prerendering do Next 16: a casca estática vai
para a borda e só os dados viajam.

---

## 8. Tema escuro

**Por que importa:** boa parte das pessoas mantém o celular em modo escuro. Um
app totalmente branco numa sala de apresentação com luz baixa incomoda, e ainda
entrega que ninguém pensou nesse caso.

As cores já estão centralizadas como variáveis em `app/globals.css`, então o
caminho é definir o contraponto escuro num bloco
`@media (prefers-color-scheme: dark)` em vez de espalhar `dark:` pelos
componentes. É mais trabalho do que as outras, mas é o tipo de acabamento que
separa protótipo de produto.

---

## 9. "Atualizado há X minutos"

**Por que importa:** um número sem data é uma afirmação; com data, é evidência.
Numa banca avaliando confiabilidade, isso pesa.

Uma linha discreta no `PageHeader` do painel, alimentada pelo `atualizadoEm` que
já vem nos dados. O mesmo dado que a lista de clientes já mostra por linha, só
que promovido ao topo da tela.

---

## 10. Voltar ao topo ao trocar de rota

**Por que importa:** é um detalhe pequeno com efeito desproporcional. Se a pessoa
rolou até o fim da lista de clientes e toca em "Início", a nova tela pode abrir
já rolada, dando a impressão de que carregou errado.

Vale conferir o comportamento real nos aparelhos e, se acontecer, forçar o topo a
cada mudança de `pathname`.

---

## 11. Um QR por cenário

**Por que importa:** o QR atual leva ao login e daí ao painel — a visão geral.
Mas as histórias mais fortes moram em telas específicas.

Um segundo QR apontando direto para o detalhe de um cliente crítico, ou para a
aba do simulador, permite dirigir a atenção sem pedir para ninguém navegar. Em
apresentação, é a diferença entre "procure o cliente C080" e todo mundo já
estar olhando para ele.

O gerador que produziu a folha de cartões aceita qualquer URL — dá para montar
uma folha com QRs diferentes por cenário.

---

## Ordem sugerida

Se houver tempo para apenas três antes da próxima demonstração: **PWA (1)**,
**tour de primeira visita (2)** e **streaming granular (7)**. A primeira muda a
moldura, a segunda diz o que olhar, e a terceira muda a sensação de velocidade —
que são exatamente as três coisas que uma pessoa julga antes de olhar para o
conteúdo.
