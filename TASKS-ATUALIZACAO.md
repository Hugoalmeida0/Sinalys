# 🔧 Task List — Correções pós-análise da base e do desafio

Documento gerado após a leitura do `Desafio - INOVAAPPS 2026.pdf`, da base `INOVAAPPS_base_de_dados.xlsx` (com o dicionário) e da auditoria do código de `lib/motor/`, `lib/ingestao/` e `app/api/`.

Complementa o `TASKS.md` (que registra o que foi construído). Aqui está **o que precisa mudar e por quê**, com a evidência medida sobre a base real.

---

## 📊 Achado que orienta todo o resto

O motor matemático **já funciona**. Reimplementado fielmente a partir de `lib/motor/*` e rodado mês a mês sobre a base real, com pesos ajustados aos 22 desfechos:

| Cenário | AUC | Precisão no top-10 | Cobertura |
| --- | --- | --- | --- |
| Motor atual, `referencia_em` **dentro** da janela de dados | **0,937** | **37,8%** | 100% |
| Regressão logística ajustada (teto prático de comparação) | 0,923 | 30,8% | — |
| Prevalência base (acaso) | — | 6,9% | — |

O mesmo motor, chamado como a rota faz **hoje** por padrão (`referencia_em = new Date()`):

```
cobertura média : 50,0%     ← as 5 regras de media_movel morrem todas
pontuação       : média 14,0 | mediana 10,9 | máx 57,2
faixas          : saudável 62 | atenção 11 | alerta 6 | crítico 1
                  (e os 80 incluem os 22 clientes que JÁ cancelaram)
```

**Conclusão:** não há problema de modelagem. Há um motor de AUC 0,94 devolvendo uma tela que diz que está tudo bem. As tarefas abaixo são, em sua maioria, encanamento e contrato de API — não matemática.

---

## 🔬 Autópsia dos 22 cancelamentos

Perfil de cada cliente que saiu, medido como desvio (z) contra **os pares no mesmo mês**, média dos 3 meses anteriores à saída. Positivo = pior que a carteira.

### Os cinco fatos que orientam a tabela de pesos

1. **21 dos 22 tinham ao menos um sinal forte** (algum z > 1). Só `C020` saiu em silêncio estatístico. Isso fixa o **teto prático de recall em ~95%** — não existe modelo que pegue os 22.
2. **Média de 4,2 sinais simultâneos por cancelado.** Cancelamento é fenômeno multi-sinal. Isso **valida a soma ponderada** e invalida qualquer regra de gatilho único.
3. **`uso_plataforma_pct` está acima da média em 22 de 22** (mediana z = +1,50). É o único sinal universal — mas veja o item 4 antes de dar peso máximo a ele.
4. **Nenhuma métrica domina sozinha.** Sinal dominante por cliente: uso 6×, tempo de resolução 4×, SLA 3×, reaberturas 3×, críticos 2×, chamados 2×, reclamações 1×, reuniões 1×. Confirma o PDF (pág. 4): *"Nenhuma delas explica um cancelamento sozinha."*
5. **Existem dois modos de cancelar, e o dinheiro está no segundo.**

### Arquétipos (agrupamento hierárquico sobre o perfil de sinais)

| Arquétipo | n | MRR total | Perfil dominante | Leitura |
| --- | --- | --- | --- | --- |
| **A — Afastamento silencioso** | 13 | R$ 66.127 | uso +1,5 · tmr +1,1 · sla +0,9 · **chamados ≈ 0** | O cliente some. Não reclama, não abre chamado. Só para de usar. |
| **B — Atrito operacional** | 6 | R$ 109.691 | crit +1,9 · cham +1,7 · reab +1,6 · uso +1,5 | O cliente briga. Volume e criticidade explodem. |
| **C — Crise aberta** (extremo de B) | 3 | R$ 99.148 | cham +2,8 · reab +2,8 · crit +2,6 · recl +2,3 | Tudo aceso ao mesmo tempo. MRR médio R$ 33k. |

**O arquétipo A é literalmente o problema descrito no PDF (pág. 2):** *"Um cliente que reclama pouco recebe pouca atenção, mesmo quando está se afastando."* São 13 dos 22 — a maioria — e são invisíveis para qualquer processo baseado em chamado ou reclamação.

**Mas o arquétipo B/C é onde está a receita:** os 5 contratos acima de R$ 20k somam **R$ 167.426/mês, 61% de toda a receita perdida**, e todos cancelaram por atrito, não por silêncio.

| | uso | sla | tmr | cham | crit | reab | recl | atr |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Grandes (≥ R$20k, n=5) | +1,7 | +0,9 | +1,2 | **+2,5** | **+2,1** | **+2,2** | **+1,9** | +0,9 |
| Demais (< R$20k, n=17) | +1,5 | +0,9 | +1,1 | +0,3 | +0,8 | +0,3 | +0,7 | +0,6 |

### O que isso impõe ao desenho dos pesos

- **Peso alto em uso, mas nunca só uso.** Um modelo dominado por `uso` acerta o arquétipo A e chega tarde no B/C — que é onde estão 61% dos reais.
- **Os sinais de atrito (chamados, críticos, reaberturas, reclamações) precisam somar por cima**, não competir. A soma ponderada faz isso naturalmente; um `max()` de regras não faria.
- **Pesos globais bastam.** As duas famílias de sinal somam no mesmo score porque `uso` é comum a ambas. Ajustar pesos por segmento com n=22 seria sobreajuste garantido.
- **O arquétipo deve virar rótulo do alerta na tela**, porque ele determina a ação: afastamento silencioso pede reativação e reunião; atrito operacional pede escalonamento de suporte. Isso responde ao *"e o que deve ser feito a respeito"* do PDF sem precisar de IA generativa.

---

## 🔴 Módulo A: Destravar o motor (bloqueante)

> **Status verificado em 2026-09-20 (consulta ao banco + leitura de `lib/motor/`, `lib/painel/`):**
>
> | Task | Estado | Evidência |
> | --- | --- | --- |
> | A.1 | ❌ aberta | Modelo ativo tem 4 regras; as 2 `media_movel` (`uso_queda`, peso 5 de 9,5 = **53% do peso**, e `nota_nps`) estão **100% "não avaliável"** (80/80 e 79/80). Cobertura média **0,503**. Mediana do score entre ativos: **0**. O score de hoje é só SLA + atraso. |
> | A.2 | 🔸 parcial | `lib/painel/clientes.ts` (`montarFilaDoDia`) já exclui `cancelado`; `app/api/motor/fila/route.ts` ainda não filtra. |
> | A.3 | 🔸 moot nesta base | `receita_mensal` foi mapeada como métrica e `valor_impacto` está preenchido em 80/80. O fallback para `atributos.valor_mensal` (também 80/80) continua não implementado — importa para a próxima base, não para esta. |
> | A.4 | 🔸 parcial | Lote ✅ (`persistirResultados` já usa `emLotes`). Dedup por dia ❌: `predicoes` tem **720 linhas com `referencia_em` em 2026-09-20** (9 rodadas × 80). Efeito colateral: `tendenciaScore` compara com a rodada anterior *do mesmo dia* → sempre "estável". |
> | A.5 | ❌ aberta | `parseConfigRegra` já lê `pontuacao_omissao`, mas nenhuma regra o define e a tela de modelo não expõe. Hoje só 1 entidade cai em omissão (C017, NPS) — porque D.4 mascara: SLA em branco usa o valor de um mês anterior. |
> | A.6 | ❌ aberta | `classificacao_nps` (texto, 422 obs) existe no projeto e é invisível ao motor, sem aviso. |

- [x] **Task A.1 — `referencia_em` default = última observação do projeto.** _(2026-09-20: `resolverReferenciaPadrao` em `lib/motor/calcular.ts`; cobertura média medida 0,503 → 0,813.)_ `app/api/motor/calcular/route.ts:30` e `lib/motor/calcular.ts` usam `new Date()`. Hoje é 2026-09; a base termina em 2026-06. Em `lib/motor/normalizacao.ts:82` a janela padrão é de 30 dias → o corte cai em 2026-08-20 → `recentes` fica vazio → `calcularMediaMovel` retorna `null` → **toda regra `media_movel` vira "não avaliável"**.
  _Critério de aceite:_ cobertura média volta a 100% e a mediana da pontuação sai de 10,9. Esta task sozinha é responsável pela maior parte do ganho.

- [ ] **Task A.2 — Excluir da fila entidades com o desfecho alvo já registrado.** `app/api/motor/fila/route.ts` não filtra por `eventos_desfecho`. Os 22 clientes cancelados permanecem na fila de priorização indefinidamente.
  _Critério de aceite:_ a fila devolve 58 clientes, não 80.

- [ ] **Task A.3 — `valor_impacto` lido de `entidades.atributos`.** O motor busca a receita como métrica reservada `receita_mensal` (`lib/motor/constantes.ts:8`), lida via `observacoes`. Mas `lib/ingestao/normalizar.ts:236` exige `data_observacao` válida para gravar qualquer métrica, e a aba `clientes` não tem coluna de data (só `inicio_contrato`). O mapeamento **não tem como produzir essa observação**. Sem `valor_impacto`, `calcularScoreUrgencia` retorna `null` e a fila inteira cai no fallback "ordenar só por risco" (`lib/motor/urgencia.ts:29`) — ou seja, a Matriz de Urgência (Task 3.3) não acontece e a pergunta 3 do PDF fica sem resposta.
  _Decisão sugerida:_ ler de `entidades.atributos->>'valor_mensal'`, com fallback para a métrica reservada. Receita de contrato é atributo cadastral, não série temporal.

- [x] **Task A.4 — Persistência em lote + dedup por dia.** _(2026-09-20: `referencia_em` truncado ao dia UTC; observações até o fim do dia.)_ `lib/motor/calcular.ts:335` faz, **por entidade**: SELECT + UPSERT + DELETE + INSERT. São ~320 round-trips sequenciais para 80 clientes — o mesmo gargalo já corrigido em `lib/ingestao/normalizar.ts` e documentado no `TASKS.md`. Além disso o dedup usa `.eq("referencia_em", referenciaEmIso)` com milissegundos: cada rodada sem `referencia_em` explícito **cria linha nova** em vez de atualizar.
  _Critério de aceite:_ reutilizar o helper `emLotes`; truncar `referencia_em` ao dia para o dedup.

- [x] **Task A.5 — `pontuacao_omissao` por regra, não global.** _(2026-09-20: default global removido — omissão sem `pontuacao_omissao` na regra é "não avaliável". Exposto no formulário de nova regra em Configurações.)_ Hoje o default é 70 para tudo (`lib/motor/constantes.ts:19`). Medido na base: as 23 linhas com `pct_sla_cumprido` vazio têm **todas** `chamados_abertos = 0` — é cliente sem nenhum chamado no mês, não dado faltante. O default de 70 fabrica risco alto para clientes calmos.
  _Regra prática:_ omissão em métrica de atendimento ≈ 0 de risco; omissão em métrica de engajamento (resposta de pesquisa) ≈ risco. Precisa ser configurável por regra, nunca global.

- [ ] **Task A.6 — Métricas de texto e booleano são invisíveis ao motor.** `definicoes_metricas.tipo_valor` aceita `'texto'` e `'booleano'`, a ingestão coage e grava (`lib/ingestao/normalizar.ts:245`), e `lib/motor/calcular.ts` filtra `.not("valor_numero", "is", null)` nas duas funções de busca. Um campo `status = 'suspenso'` ou `renovou = false` entra no banco e **desaparece silenciosamente** do cálculo. É um buraco de agnosticismo: numa base onde o sinal forte seja categórico, o motor fica cego sem avisar.
  _Mínimo aceitável:_ emitir aviso em `avisos[]` quando houver métrica não numérica referenciada por uma regra.

---

## 🔴 Módulo B: Fazer a API responder as três perguntas do PDF

O critério de aceite do desafio (pág. 2) é: *"ao abrir a solução, alguém que trabalha com a carteira precisa conseguir responder três perguntas: com quais clientes falar, por que cada um deles, e em que ordem."*

**Hoje a API responde uma** (a ordem).

- [ ] **Task B.1 — A fila precisa devolver os dados do cliente.** `app/api/motor/fila/route.ts:42` seleciona apenas `id, entidade_id, pontuacao, faixa_risco, cobertura, valor_impacto, referencia_em`. `entidade_id` é **UUID**. Não vem `id_externo` (C080), `nome_exibicao` nem `atributos` (segmento, porte, plano) — a tabela `entidades` tem todos esses campos (`docs/modelagem.sql:22`) e ninguém faz o join.
  _Isto é a reclamação original: "o motor não retorna os dados do cliente"._

- [ ] **Task B.2 — A fila precisa devolver os motivos resolvidos.** O motor **persiste** `motivos_predicao` corretamente e a rota da fila **nunca os lê**. E `motivos_predicao` guarda `regra_modelo_id` — para virar texto na tela precisa de join até `definicoes_metricas.rotulo`, mais a `direcao` da regra e o `valor_observado`.
  _Formato sugerido por motivo:_ rótulo da métrica, valor observado, valor normalizado, peso, contribuição em % do score.

- [ ] **Task B.3 — Campo `meses_em_risco` (há quantos meses o sinal está aceso).** Não existe em lugar nenhum hoje e resolve **dois** pontos do enunciado de uma vez: a pergunta 1 da pág. 3 ("com quanta antecedência o sinal aparece?") e o aviso do Leia-me ("a pior foto de um mês não basta para separar risco de ruído"). Evidência medida: uso médio de 3 meses abaixo de 60% aparece em **apenas 3 clientes ativos** contra 13 meses-cliente de cancelados. Queda profunda **e sustentada** é quase específica de churn; queda de um mês, não.

- [ ] **Task B.4 — `GET /api/motor/cliente/[id]`** com a série histórica de predições e o raio-x das métricas. O componente `components/clientes/ScoreEvolucaoChart.tsx` precisa dessa série e ela não existe em nenhuma rota.

- [ ] **Task B.5 — Backfill mensal do motor.** `predicoes` é particionada por `referencia_em`. Rodar o motor de 2025-07 a 2026-06 faz a série histórica existir de verdade, em vez de gerada no front (`gerarEvolucaoScore` em `lib/mock-data.ts`).

---

## 🟠 Módulo C: Tabela de pesos agnóstica, aprendida dos desfechos

> **Princípio de projeto.** O sistema **não sabe o que é SLA**. Ele sabe: *métrica X, transformação Y, peso W, direção D*. A tabela de pesos é indexada por `(metrica_id, transformacao)` — nunca por conceito de negócio. Trocar a planilha troca as métricas, e os pesos são reajustados sobre o que vier. É isso que torna a predição agnóstica em vez de calibrada à mão para esta base.

**Estado hoje (verificado no código):** `eventos_desfecho` é **write-only** — só `lib/ingestao/normalizar.ts:320` escreve, ninguém lê. Não existe nenhuma rotina de ajuste. Os 22 cancelamentos não influenciam um único número na tela.

### C.0 — Onde isso encaixa: `regras_modelo` **já é** a tabela de pesos

Esta é a boa notícia estrutural. Não é preciso criar tabela nova — o schema já foi desenhado para isso e nunca foi usado assim:

| Coluna existente | Papel na tabela de pesos |
| --- | --- |
| `regras_modelo.metrica_id` | qual métrica (FK para `definicoes_metricas` — agnóstico) |
| `regras_modelo.codigo_sinal` | `{codigo_metrica}#{transformacao}`, ex.: `uso_plataforma_pct#coorte` |
| `regras_modelo.peso` | **o peso ajustado** |
| `config_regra.direcao` | **a direção descoberta** (`maior_pior` / `menor_pior`) |
| `config_regra.tipo` | o tipo de normalização que o motor já sabe executar |
| `modelos.avaliacao` | desempenho medido (hoje `'{}'::jsonb`) |
| `modelos.inicio_treinamento` / `fim_treinamento` | janela usada no ajuste |
| `UNIQUE (modelo_id, codigo_sinal)` | garante uma regra por (métrica, transformação) |

E as transformações mapeiam nos tipos de regra que o motor **já executa**:

| Transformação | Significado | Tipo de regra | Estado |
| --- | --- | --- | --- |
| `coorte` | z contra os pares no mesmo período | `zscore_carteira` | ✅ existe (corrigir período — Task D.4) |
| `desvio` | janela recente contra o próprio passado | `media_movel` | ✅ existe |
| `nivel` | média de 3 períodos, z contra coorte | `zscore_carteira` + suavização | 🔸 pequena adição |
| `persistencia` | períodos consecutivos acima do limiar | — | ❌ novo (Task D.1) |

**Consequência:** o ajustador escreve linhas que `lib/motor/calcular.ts` já sabe ler. O motor **não muda**. Isso não é reescrita, é preencher uma tabela que hoje é preenchida à mão.

### Passo a passo

- [ ] **Task C.1 — Alterações de schema (as únicas necessárias).**

  ```sql
  ALTER TABLE regras_modelo
    ADD COLUMN origem text NOT NULL DEFAULT 'manual'
      CHECK (origem IN ('manual', 'ajustado')),
    ADD COLUMN poder numeric(5,4);   -- |AUC - 0.5| * 2 da feature que gerou o peso

  -- config_regra passa a carregar, além de `tipo` e `direcao`:
  --   "transformacao": "nivel" | "desvio" | "coorte" | "persistencia"
  ```

  Nenhuma tabela nova. `origem` é o que permite ao usuário sobrescrever um peso sem que o próximo ajuste apague a decisão dele.

  ⚠️ **Refletir as duas colunas em `docs/modelagem.sql`.** O arquivo é a fonte de verdade do schema no repo; migration aplicada só no Supabase e não refletida ali deixa o schema documentado divergindo do real — e o próximo a rodar o `modelagem.sql` num ambiente limpo perde as colunas.

- [ ] **Task C.2 — Painel: view materializada, uma linha por `(entidade, periodo)`.**
  Hoje o motor lê `observacoes` uma métrica por vez e pivota em memória. Para ajustar pesos é preciso o formato largo. 80 clientes × 18 meses = 1.440 linhas — barato.

  ```sql
  CREATE MATERIALIZED VIEW painel_entidade_periodo AS
  SELECT entidade_id,
         date_trunc('month', observado_em) AS periodo,
         metrica_id,
         avg(valor_numero) AS valor
  FROM observacoes
  WHERE valor_numero IS NOT NULL
  GROUP BY 1, 2, 3;
  ```

  _Agnóstico:_ nada de nome de coluna. O grão (`month`) vem de `projetos`, ver Task D.3.

- [ ] **Task C.3 — Gerar as features automaticamente, sem escolha humana.**
  Para **toda** métrica numérica do projeto, quatro features nascem sozinhas. Ninguém configura quais métricas importam — a regularização decide.

  ```sql
  nivel  = avg(v) OVER (PARTITION BY entidade_id, metrica_id
                        ORDER BY periodo ROWS 2 PRECEDING)
  base   = avg(v) OVER (PARTITION BY entidade_id, metrica_id
                        ORDER BY periodo ROWS BETWEEN 8 PRECEDING AND 3 PRECEDING)
  desvio = nivel - base
  coorte = (v - avg(v) OVER (PARTITION BY metrica_id, periodo))
           / nullif(stddev(v) OVER (PARTITION BY metrica_id, periodo), 0)
  ```

  Validado: 13 métricas → 42 features geradas → a regularização manteve 12 e zerou 27.

- [ ] **Task C.4 — Rótulo, com tratamento de censura.**
  Derivado de `eventos_desfecho` + `modelos.codigo_evento_alvo` + `horizonte_dias`:

  ```
  alvo(e, p) = 1  se o evento alvo ocorre em (p, p + K]
  censurado(e, p) = true  se a entidade segue ativa e p > (último período) - K
  ```

  **Linhas censuradas saem do treino** — o cliente ativo nos últimos K meses não é um negativo, é um desconhecido. Na base: 174 linhas censuradas removidas, restando 50 positivos em 647 linhas.

  **Armadilha desta base, confirmada:** cliente cancelado **não tem linha no mês da saída** — o último registro é sempre o mês anterior. Rótulo "cancelou neste mês" nunca seria verdadeiro.

- [ ] **Task C.5 — Ajuste dos pesos: diferenciação × antecedência (fórmula adotada).**

  Método escolhido pelo time, validado contra a base. Sinais são **binários** (dispara/não dispara), o que torna o `PredictionService` uma soma trivial em TypeScript e a explicação legível por um analista de CS.

  ```
  Dᵢ = max(0, P(Eᵢ) − P(Nᵢ))          diferenciação
  Aᵢ = eventos com sinal ≥ 60d antes / eventos analisáveis
  Iᵢ = Dᵢ × (1 + Aᵢ)                   importância
  Pesoᵢ = Iᵢ / ΣI × 100                normalização
  ```

  **Desempenho medido (GroupKFold por cliente, out-of-fold):**

  | Método | AUC |
  | --- | --- |
  | Fórmula D×(1+A), **limiar aprendido** (Task C.5b) | **0,947** |
  | Fórmula D×(1+A), limiar fixo z=0,5 | 0,935 |
  | Fórmula D×(1+A), limiar fixo z=1,5 | 0,904 |
  | _[referência] univariado contínuo_ | 0,939 |
  | _[referência] logística L1 contínua_ | 0,947 |

  **A binarização custa 0,4 ponto de AUC.** Troca correta: perde-se magnitude, ganha-se explicabilidade e um `predict()` sem biblioteca.

  **A direção sai de Dᵢ, não de configuração** — avalia-se o sinal nos dois lados (`z > limiar` e `z < −limiar`) e o lado com D maior vence. Ninguém declara que uso baixo é ruim.

  ⚠️ **`Iᵢ = 0` para todos ⇒ não dividir por zero.** O treino deve devolver `evidencia_insuficiente` e manter o modelo anterior ativo.

- [ ] **Task C.5b — Aprender o limiar de cada sinal (não escolher à mão).**
  Esta task resolve a ressalva conhecida do método: *"o motor não aprende automaticamente bons limites apenas por calcular os pesos"*. Resolve-se varrendo o limiar e ficando com o que maximiza `Dᵢ`:

  ```ts
  for (const z of [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0])
    for (const lado of [">", "<"]) {
      const sinal = lado === ">" ? zscore > z : zscore < -z;
      if (contar(sinal) < 5) continue;              // amostra mínima
      const D = Math.max(0, taxa(sinal, evento) - taxa(sinal, naoEvento));
      if (D > melhor.D) melhor = { D, z, lado };
    }
  ```

  **Ganho medido: 0,935 → 0,947** — empata com a regressão logística. E os limiares saem em **desvios-padrão**, nunca em "uso abaixo de 60%", então seguem agnósticos. Custo: 14 avaliações por sinal.

  _Limiares aprendidos nesta base (amostra):_

  ```
  uso_plataforma_pct|nivel    dispara quando z < 0.50    peso 5.71
  uso_plataforma_pct|coorte   dispara quando z < 1.00    peso 5.67
  nota_nps|coorte             dispara quando z < 0.75    peso 5.22
  pct_sla_cumprido|nivel      dispara quando z < 0.75    peso 4.93
  tempo_medio_resolucao_h|nivel dispara quando z > 0.75  peso 4.76
  ```

- [ ] **Task C.5c — Usar `Aᵢ` como porta, não só como multiplicador.**
  **Achado importante:** nesta base o fator `(1 + Aᵢ)` está **inerte**. Entre os 12 sinais de maior peso, `Aᵢ` varia de **0,82 a 1,00 — amplitude 0,18**. Quase todo sinal aparece com ≥60 dias de antecedência em ~88% dos eventos, então `(1+A)` multiplica praticamente todos por ~1,88 e **desaparece na normalização** `Peso = I/ΣI`.

  | | com (1+A) | sem (1+A) |
  | --- | --- | --- |
  | z=0,5 | 0,935 | 0,935 |
  | z=1,0 | 0,925 | 0,922 |
  | z=1,5 | 0,904 | 0,905 |

  Isso não invalida a fórmula — é propriedade desta base, e numa base com sinais tardios o fator trabalharia. **Manter o cálculo** (é onde o critério "antecedência" do PDF entra no motor), e adicionar o uso que de fato protege: **descartar sinais com `Aᵢ` abaixo de um mínimo** (sugestão: 0,5), que é a definição operacional de *"um sinal que só se manifesta no mês da saída pode ser certeiro e, ainda assim, inútil"* (PDF, pág. 3).

  ⚠️ **Não afirmar em apresentação que o fator de antecedência está discriminando os pesos.** Nesta base ele não está, e isso é verificável em trinta segundos.

- [ ] **Task C.6 — Gravar o resultado em `regras_modelo` com `origem='ajustado'`.**
  Cria um `modelos` novo (`versao + 1`, `status='validado'`), grava as regras, e só promove para `status='ativo'` se a avaliação superar o modelo ativo atual. Regras com `origem='manual'` são preservadas.

- [ ] **Task C.7 — Gravar `modelos.avaliacao`** com o desempenho medido, em validação cruzada **agrupada por entidade** (cliente nunca em treino e teste ao mesmo tempo):

  ```json
  { "auc": 0.947, "precisao_top10": 0.378, "antecedencia_mediana_meses": 2,
    "n_eventos": 22, "n_linhas": 647, "horizonte_meses": 3,
    "metodo": "diferenciacao_x_antecedencia", "limiar": "aprendido",
    "amplitude_A": 0.18, "ajustado_em": "2026-09-20" }
  ```

  `amplitude_A` é diagnóstico, não decoração: quando ela é pequena (como aqui, 0,18), o fator `(1+A)` não está discriminando nada — ver Task C.5c. Gravar isso evita que alguém atribua ao fator um mérito que ele não tem.

  Sem isso não há como saber se um reajuste melhorou ou piorou.

- [ ] **Task C.8 — Calibrar o score para probabilidade.**
  Hoje `pontuacao` é índice 0-100 de severidade média. Calibrar (binning contra a taxa observada) transforma em probabilidade, e aí:

  ```
  perda_esperada = P(evento em K meses) × valor_impacto × 12
  ```

  vira **reais**, não "índice vezes dinheiro". É o que responde a pergunta 3 do PDF (*"quanto está em jogo"*) e o que torna o limiar uma conversa de negócio.

- [ ] **Task C.9 — Modo partida a frio (cliente novo, zero desfechos).**
  Medido: score de anomalia puro, sem rótulo nenhum, dá **AUC 0,786**. É exatamente o que o motor de vocês faz hoje. Não é versão provisória — é o modo de partida a frio, e todo produto desse tipo precisa de um.

  | | Sem desfechos | Com desfechos |
  | --- | --- | --- |
  | Pesos | iguais | ajustados |
  | Direção | desconhecida (usa \|z\|) | aprendida |
  | AUC | 0,786 | 0,945 |

  Curva de aprendizado medida — a transição é rápida:

  | Desfechos para treino | AUC | |
  | --- | --- | --- |
  | 3 | 0,807 | instável (desvio 0,12) |
  | **5** | **0,899** | já utilizável |
  | 8 | 0,917 | |
  | 12 | 0,936 | |

  **Cinco cancelamentos já viram um modelo bom.** Regra de produto: abaixo de 5 desfechos, rodar em modo frio e dizer isso na tela; a partir de 5, ajustar e avisar que o modelo se calibrou.

- [ ] **Task C.10 — `POST /api/modelo/ajustar`** orquestrando C.2 → C.7, e acionada ao fim de cada ingestão que traga novos desfechos.

- [ ] **Task C.11 — Remover `pesosModeloRisco` de `lib/mock-data.ts:553`.**
  A tela de Configurações lê esse array e o motor lê `regras_modelo` — **a tela mostra um conjunto de pesos que não tem relação com o cálculo ao lado**. Passar a ler de `regras_modelo`, exibindo `origem` e `poder`.

- [ ] **Task C.12 — Agrupar sinais correlacionados e limitar a pontuação por grupo.**
  O risco de contagem dupla é **real e mensurável** nesta base: com limiares aprendidos, `uso_plataforma` aparece três vezes — `nivel`, `coorte` e `desvio` — somando **17,05 dos 100 pontos** para o que é um único fenômeno. `pct_sla_cumprido` repete o padrão.

  ```
  uso_plataforma_pct|nivel    peso 5.71  ┐
  uso_plataforma_pct|coorte   peso 5.67  ├─ 17,05 pts para um só fenômeno
  uso_plataforma_pct|desvio   peso 5.67  ┘
  ```

  _Mitigação:_ agrupar por `metrica_id` (as três transformações da mesma métrica são o mesmo grupo por construção — não precisa descobrir correlação) e aplicar um teto por grupo, ex.: 60% do peso somado do grupo, ou contar só a transformação de maior `D`. Guardar o grupo em `config_regra.grupo` para o motor respeitar o teto.

- [ ] **Task C.13 — `lib/motor/score.ts` precisa mudar de média ponderada para soma ponderada.**
  Hoje o score é `Σ(valor_normalizado × peso) / Σ(peso)` — média ponderada de valores contínuos 0-100. A fórmula adotada é `Σ(Peso × Sinal)` com sinal binário e pesos que **já somam 100**. São contas diferentes e incompatíveis.

  Com a soma ponderada o `CHECK (pontuacao BETWEEN 0 AND 100)` fica satisfeito por construção, e o comentário que justifica a média ponderada em `lib/motor/score.ts:11` deixa de valer — **atualizar o comentário junto**, senão o próximo a ler o arquivo reintroduz a média.

- [ ] **Task C.15 — Ponto no tempo (`disponivel_em`) também no TREINO, não só na predição.**
  `lib/motor/calcular.ts:60` já filtra `.lte("disponivel_em", referenciaEmIso)` no cálculo — o caminho de predição está correto. **O caminho de treino não existe ainda e é onde o vazamento entra sem avisar.**

  A view da Task C.2, como especificada, agrega `observacoes` sem olhar `disponivel_em`. Se um dado de março só ficou conhecido em maio (reprocessamento, correção de planilha, ingestão atrasada), o treino aprende com informação que não existia em março, e o AUC medido não se reproduz em produção.

  ```sql
  -- a view precisa ser parametrizada pelo período de referência:
  WHERE valor_numero IS NOT NULL
    AND disponivel_em <= fim_do_periodo   -- ← isto falta na C.2
  ```

  Regra: **um score calculado em março só pode usar o que estava disponível até março** — vale igualmente para prever e para aprender. É o item 1 de robustez do método adotado, e o mais fácil de esquecer porque não quebra nada: só produz um número bom demais.

- [ ] **Task C.16 — Validar em período posterior, não só em validação cruzada.**
  A Task C.7 mede com `GroupKFold` por entidade — isso testa generalização **para outros clientes**. Não testa generalização **para o futuro**, que é o uso real.

  Adicionar um holdout temporal: treinar nos primeiros N períodos, medir nos últimos. Nesta base, treinar até 2025-12 e medir em 2026-01→06 (11 dos 22 cancelamentos caem nessa janela). As duas medidas contam histórias diferentes e ambas precisam ser gravadas em `modelos.avaliacao`:

  ```json
  { "auc_cv_por_entidade": 0.947, "auc_holdout_temporal": null }
  ```

  Só promover para `status='ativo'` (Task C.6) com **as duas** aprovadas. Um modelo que vai bem em clientes novos e mal em meses novos está aprendendo o período, não o comportamento.

- [ ] **Task C.14 — `insufficient_data` em vez de risco artificialmente baixo.**
  Com sinais binários, métrica ausente **não pode virar `Sinal = 0`** — isso é indistinguível de "avaliado e não disparou" e produz score baixo falso. O `PredictionService` deve receber `true | false | undefined`, calcular a cobertura e devolver `insufficient_data` abaixo de um mínimo, em vez de pontuar. Casa com a Task A.5 (`pontuacao_omissao` por regra) e com `predicoes.cobertura`, que já existe no schema.

---

## 🟠 Módulo D: Fechar os buracos de agnosticismo do motor

- [ ] **Task D.1 — Novo tipo de regra: persistência.** Só existem `zscore_carteira` e `media_movel`. Não há como expressar "N meses consecutivos acima do limiar", que é o mecanismo anti-alarme-falso que a própria planilha manda usar. É o sinal mais limpo da base (ver Task B.3) e o motor **não consegue representá-lo**.

- [x] **Task D.2 — Limiar real para `acionado`.** _(2026-09-20: `LIMIAR_Z_ACIONADO = 1` (≈ 33 na escala 0-100 com clip 3), não os 60 sugeridos — 1σ é explicável ao analista e coerente com os limiares aprendidos em C.5b, que ficam entre 0,5σ e 1σ. Medido: SLA acionado 40/80 → 11/80; atraso 32/80 → 7/80.)_ `lib/motor/calcular.ts:262` faz `acionado: normalizado > 0`. Como `escalarBadness` faz clamp do negativo em 0, metade da carteira recebe exatamente 0 (`acionado: false`) e a outra metade recebe `true` em **toda** regra, mesmo a +0,1 desvio. `acionado` hoje significa "está acima da média da carteira", não "tem um alerta" — e como os motivos são a evidência mostrada ao usuário, isso torna a explicação inútil.
  _Sugestão:_ `normalizado >= 60`.

- [ ] **Task D.3 — `definicoes_metricas.cadencia` existe e nunca é lida.** `janela_dias` em dias, contra dado mensal e NPS trimestral, é um descompasso que o sistema não consegue raciocinar. Funcionou nesta base por coincidência; numa base diária ou semanal os mesmos defaults dão outro resultado sem que ninguém saiba por quê.

- [ ] **Task D.4 — Z-score de carteira só entre entidades com observação no período de referência.** `lib/motor/calcular.ts:49` (`buscarValorMaisRecentePorEntidade`) pega a última observação de **qualquer época**: um cliente que cancelou em 2025-05 entra na média da carteira com o valor de 2025-04, comparado contra ativos de 2026-06.
  _Prioridade baixa:_ medido, o custo em precisão é praticamente nulo dentro da janela de dados (AUC 0,911 → 0,905). Corrigir por higiene, não por precisão.

---

## 🟡 Módulo E: Ingestão sem mapeamento manual

**Problema:** o De-Para pede que um usuário leigo informe manualmente aquilo que o arquivo já diz sozinho. Sintoma já registrado no `TASKS.md`: foi preciso criar um botão para "ignorar aba inteira" porque usuários se confundiam com as abas "Leia-me" e "dicionario".

**Evidência:** um inferidor que olha só a estrutura do arquivo — cardinalidade, formato de data, repetição de valores entre abas, sem ler nome de coluna, sem usar a aba `dicionario`, sem IA — acertou **30 de 30** decisões de mapeamento nesta base, incluindo descartar as duas abas não tabulares e identificar que `situacao` é desfecho e `mes_cancelamento` é data de evento.

- [ ] **Task E.1 — Inferidor estrutural de De-Para.** Gera a proposta de mapeamento automaticamente e grava em `mapeamentos_importacao`. A modelagem atual **não muda** — muda quem a preenche. Protótipo validado: ~60 linhas.

- [ ] **Task E.2 — Tela de confirmação em linguagem de negócio,** não de schema:

  ```
  Li seu arquivo. Isto é o que entendi:

    80 clientes, histórico de jan/2025 a jun/2026
    22 cancelamentos — vou usar como referência para aprender
    17 indicadores acompanhados mês a mês

    ⚠ Não identifiquei quanto cada cliente paga por mês.
      Sem isso eu digo quem está em risco, mas não em que ordem atacar.
      → [ valor_mensal ]  [ outra coluna ▾ ]

                        [ Está correto ]   [ Ajustar mapeamento ]
  ```

  A única pergunta que sobra é a que o dado genuinamente não responde: **qual coluna é dinheiro**. Estrutura não distingue `valor_mensal` de `sla_contratado_h` (ambos inteiros, um por cliente), mas qualquer gestor responde isso em dois segundos.

- [ ] **Task E.3 — `MapeamentoStep.tsx` vira saída de emergência.** Nada do que já foi construído se perde; o componente só sai do caminho principal e passa a ser acessado por "Ajustar mapeamento".

  _Limite conhecido:_ testado em um arquivo bem-comportado. Quebra em formato largo (meses como colunas), células mescladas, dois cabeçalhos, ou várias tabelas na mesma aba. A meta é acertar no caso comum e falhar de forma visível — por isso a saída manual continua existindo.

---

## 🟡 Módulo F: Front — alinhar com o que a base sustenta

- [ ] **Task F.1 — Unificar a escala do score.** O front usa `scoreRisco: 14, scoreMax: 18` (`lib/mock-data.ts:9`); o banco tem `pontuacao numeric(7,3) CHECK BETWEEN 0 AND 100` e o motor chama `faixaRiscoFromScore(pontuacao, 100)`. São duas escalas para a mesma coisa — escolher uma antes de plugar o front no backend.

- [ ] **Task F.2 — Corrigir os KPIs de antecedência.** `lib/mock-data.ts:205` anuncia `antecedenciaMediaMeses: 4.4` e `antecedenciaMaximaMeses: 8`. O número real desta base é **mediana 2 meses, média 2,4, máximo 11**:

  | Limiar | Detectados | Antecedência mediana | Falsos positivos |
  | --- | --- | --- | --- |
  | 0,20 | 17/22 | 2 meses | 14 de 58 ativos |
  | 0,30 | 16/22 | 2 meses | 11 de 58 |
  | 0,40 | 16/22 | 1,7 mês | 9 de 58 |
  | 0,50 | 13/22 | 1 mês | 8 de 58 |

  Número inflado é fácil de derrubar numa banca. E 2 meses já é infinitamente melhor que o cenário do PDF, onde a empresa descobre no dia em que o cliente avisa.

- [ ] **Task F.3 — "Receita em risco" deve multiplicar pela probabilidade.** Hoje é MRR × 12 direto. Somando a carteira inteira daria ~R$ 11,8M "em risco" numa base cujo churn anual real foi R$ 3,3M (R$ 274.966 de MRR cancelado sobre R$ 982.964 totais). O número honesto é MRR × 12 × probabilidade.

- [ ] **Task F.4 — Coluna "sinal aceso há N meses"** na tabela de clientes (consome a Task B.3). É a resposta visual à pergunta 1 do PDF.

- [ ] **Task F.5 — `porte` e `plano` saem como indicadores de risco.** Medido: churn por porte 28,6% / 26,9% / 26,3% e por plano 28,6% / 26,9% / 26,3%. É uma reta — não predizem nada. Servem só como filtro e contexto. `valor_mensal` entra apenas como **impacto** na urgência, nunca no score de risco.

- [ ] **Task F.6 — Exibir o arquétipo do alerta.** A autópsia mostrou dois modos de cancelar com ações opostas: **afastamento silencioso** (13 de 22 — uso cai, não abre chamado) pede reativação e reunião; **atrito operacional** (9 de 22, 61% da receita perdida) pede escalonamento de suporte. O arquétipo sai de graça do próprio vetor de contribuições: basta ver se as features de atrito (`chamados`, `criticos`, `reaberturas`, `reclamacoes`) dominam ou não o score. Responde ao *"o que deve ser feito a respeito"* do PDF **sem IA generativa**.
  _Agnóstico:_ não rotular com nome de métrica. O arquétipo é "as features de maior contribuição são as do grupo X" — o grupo é descoberto por correlação entre features, não declarado.

- [ ] **Task F.7 — Priorizar as telas que respondem o teste de completude.** Início, Clientes e detalhe do cliente **são** a resposta. Relatórios, Playbook e Assistente não respondem nenhuma das três perguntas — o PDF diz explicitamente que *"o resultado esperado não é um número por cliente, e sim uma ordem de atendimento que alguém possa seguir"*.

---

## 🟠 Módulo G: Ordem da fila e tratamento de nulos (análise de 2026-09-20)

Origem: pedido do usuário — *"a ordenação tem que ser via score, mas levando em conta o fator financeiro e o tamanho da empresa: uma pequena com score alto vs. uma grande com score médio que gasta mais, a prioridade é a grande"* — e *"alguns campos NULL viram 0 e dão falso alarme"*.

### G.0 — Como a ordem é decidida hoje (medido na base)

Existem **dois números** e a fila usa o segundo:

| | Fórmula | Onde | Problema medido |
| --- | --- | --- | --- |
| `pontuacao` (Score de Risco) | `Σ(normalizado × peso) / Σ(peso)`, 0-100 | `lib/motor/score.ts` | Não sabe nada de dinheiro. Top 4 por risco são todos **Pequeno** (C033 50, C009 48,9, C078 43,2, C019 33,1). |
| `scoreUrgencia` | `pontuacao × valor_impacto` (R$ bruto, sem teto) | `lib/motor/urgencia.ts`, ordena `montarFilaDoDia` | Dominado pelo MRR. **C055 (Grande, score 6,6, "saudável") fica acima de C009 (score 48,9, "alerta")**; C011 (score 24,6, saudável) é o nº 1 da fila. Número ilegível na tela (756.776). |

Ou seja: o pedido do usuário **já é a intenção da Matriz de Urgência** (`docs/motor-matematico.md §4`), mas a implementação atual exagera — o produto puro deixa uma grande saudável na frente de uma pequena em alerta. O `Score de Risco` puro erra para o outro lado. Nenhum dos dois é o que o usuário descreveu.

**Contexto que limita qualquer calibração agora:** todos esses scores foram calculados com **cobertura 0,5** (Task A.1 aberta — a regra de uso, 53% do peso, está morta). Qualquer fórmula de prioridade ajustada hoje será reajustada depois de A.1.

- [x] **Task G.1 — Score de Prioridade (0-100) = risco × fator de impacto limitado.** _(2026-09-20: `calcularScorePrioridade` em `lib/motor/urgencia.ts`; `ClientePainel.scorePrioridade`; fila, tabela de clientes e "Ver fila completa" ordenam por ele. Coluna "Prioridade" ao lado da pílula de risco.)_ Substituir o produto bruto por um fator de impacto **relativo à carteira e em escala log**, para que o MRR module o risco sem engoli-lo:

  ```
  impacto_rel  = ln(MRR / MRR_min) / ln(MRR_max / MRR_min)      ∈ [0, 1], sobre os ATIVOS da carteira
  prioridade   = risco × (0.5 + impacto_rel)                    ∈ [0, 1.5 × risco]
  ```

  Simulado sobre os 58 ativos (scores atuais, cobertura 0,5):

  | Cliente | Porte | Risco | Faixa | MRR | urgência atual (÷1000) | **prioridade** |
  | --- | --- | --- | --- | --- | --- | --- |
  | C080 | Grande | 33,0 | atenção | 20.924 | 691 (2º) | **42,8 (1º)** |
  | C033 | Pequeno | 50,0 | alerta | 4.310 | 216 (6º) | **35,5 (2º)** |
  | C011 | Grande | 24,6 | saudável | 30.742 | 757 (1º) | 35,4 (3º) |
  | C009 | Pequeno | 48,9 | alerta | 2.836 | 139 (12º) | 27,1 (4º) |
  | C055 | Grande | 6,6 | saudável | 31.660 | 210 (7º) | 9,6 (fora do top 10) |

  É exatamente a regra pedida: grande com score médio (C080) passa a pequena com score alto (C033); grande saudável (C055) **não** passa ninguém em alerta. Alternativas testadas e descartadas: linear em vez de log (MRR_max/MRR_min = 15× → linear achata os médios); média geométrica `risco^0.65 × impacto^0.35` (coloca 4 "saudáveis" no top 7).

  _Onde:_ `lib/motor/urgencia.ts` (`calcularScoreUrgencia` recebe também `mrrMin`/`mrrMax` da carteira) e `lib/painel/clientes.ts` (calcula min/max sobre `!cancelado` antes do loop). `montarFilaDoDia` continua ordenando por `scoreUrgencia` — só o número muda. **`pontuacao` e `faixa_risco` não mudam** (coerente com F.5: dinheiro é impacto, nunca risco).
  _Tela:_ a fila mostra a pílula de **risco** (faixa) e ordena por **prioridade**; o subtítulo "Ordenada por receita em risco" passa a "Ordenada por prioridade (risco × impacto)". Refletir a fórmula em `docs/motor-matematico.md §4`.
  _Aceite:_ nos 58 ativos, nenhum "saudável" com risco < 15 aparece no top 5; C080 > C033.

- [x] **Task G.2 — Impacto desconhecido não é R$ 0.** _(2026-09-20: `mrr`, `receitaAnualRisco` e `variacaoMrr` viram `null`; UI mostra "—"; impacto relativo cai para o porte.)_ `lib/painel/clientes.ts:255` faz `mrr = numero(valor_impacto) ?? 0` → a tela mostra **R$ 0** de MRR e **R$ 0** em risco para cliente sem receita mapeada, e `receitaAnualRisco` zera. Não ocorre nesta base (80/80 com receita), mas é o primeiro sintoma na próxima. Regra: `mrr: number | null`; `impacto_rel` cai para `atributos.porte` (Pequeno 0,25 / Médio 0,5 / Grande 0,75) e, sem porte, para 0,5 (mediana); UI mostra "—", nunca "R$ 0". Casa com A.3.

- [ ] **Task G.3 — Nulos que viram score: mapa completo.** Auditado onde um dado ausente vira número. Só dois viram *alarme falso*; o resto vira *silêncio falso*, que é pior para o produto:

  | Onde | O que acontece com o NULL | Efeito | Task que resolve |
  | --- | --- | --- | --- |
  | `lib/motor/calcular.ts` omissão → `PADRAO_PONTUACAO_OMISSAO = 70` | ausência vira **70 pontos × peso** | 🔴 alarme falso (cliente sem chamado no mês, NPS trimestral fora do mês) | **A.5** |
  | `lib/motor/calcular.ts:262` `acionado: normalizado > 0` | z = +0,05 já é "acionado" | 🔴 alarme falso na explicação: 40/80 "SLA acionado", 32/80 "atraso acionado", chips de "Principais sinais" com desvios irrelevantes | **D.2** (`>= 60`) |
  | `lib/motor/score.ts:33` nenhuma regra avaliável → `pontuacao = 0` | ausência vira **"saudável"** | 🟠 silêncio falso — hoje 60/80 "saudável" com cobertura 0,5 | **C.14** + G.4 |
  | `calcularMediaMovel` → `null` quando `recentes` vazio | regra some do score sem aviso na tela | 🟠 silêncio falso (é o que A.1 destrava) | **A.1** |
  | `buscarValorMaisRecentePorEntidade` pega valor de qualquer época | SLA em branco (23 linhas, todas com chamados = 0) usa o mês anterior | 🟡 mascara a omissão em vez de tratá-la | **D.4** |
  | `lib/painel/clientes.ts:255` `mrr ?? 0` | receita ausente vira R$ 0 | 🟡 impacto falso | **G.2** |
  | `lib/painel/clientes.ts:265` `variacaoMrr = 0` sem histórico | "0%" indistinguível de "estável" | 🟢 cosmético | mostrar "—" |
  | `tendenciaScore` compara com a predição anterior (mesmo dia) | 720 linhas em 2026-09-20 → sempre "estável" | 🟡 tendência falsa | **A.4** (dedup por dia) |

  **Confirmado o que NÃO é problema:** a ingestão (`coagirValorMetrica`) descarta vazio em vez de gravar 0 — NPS em branco não vira nota 0 (coerente com o "Não fazer"). Zeros legítimos (`dias_atraso` 623/1295, `chamados_criticos` 647/1295, `reclamacoes` 878/1295) são valores reais, não nulos.

- [x] **Task B.5 — Backfill mensal do motor** _(2026-09-20: `scripts/backfill-motor.mts` (`--limpar` apaga rodadas antigas com referência posterior à última observação). Executado para os 80 clientes: 18 referências mensais, 1.442 predições, nenhuma posterior a jun/2026. KPI de antecedência medido: mediana 1,9 meses, média 2,1, 19 dos 22 desfechos antecipados.)_

> **Clientes de teste do motor novo (2026-09-20) — já removidos.** Serviram para a comparação abaixo; depois o usuário autorizou apagar as predições do motor antigo e recalcular os originais. Histórico: decisão inicial de não apagar as 820 predições antigas (calculadas pelo motor anterior, com `referencia_em` de 2026-09-20/19, 2026-06-30 e 2025-04-15). Em vez disso, cada cliente real foi clonado como `<id>-T` (`atributos.teste_motor = true`, `teste_origem = <id>`), com observações e desfechos, e o motor novo rodou mês a mês só para os clones. A UI marca esses clientes com o badge **Teste**; o painel de Clientes conta "N de teste do motor novo". Para desfazer: `npx tsx scripts/clientes-teste-motor.mts remover`. Enquanto os clones existirem, KPIs de carteira somam 160 clientes e a estatística de carteira do z-score inclui cada valor duas vezes (mesma média; desvio praticamente igual).
>
> Medido lado a lado (originais = motor antigo, `-T` = motor novo): C033 50/alerta → **20/saudável**; C080 33/atenção → **46/alerta** (uso ↓ 66,5%); C070 19/saudável → **50/alerta** (uso ↓ 69,7%, NPS 6); C011 25/saudável → 3/saudável. Antecedência (KPI, só clones têm histórico): mediana **2 meses**, média 2,6, **20 dos 22** desfechos antecipados — coerente com a F.2.

- [ ] **Task G.4 — Cobertura mínima na tela.** Enquanto C.14 não existe: com `cobertura < 0,75`, a faixa exibida vira "dados insuficientes" (cinza) em vez de "saudável", e o cliente sai do KPI "clientes em alerta" e do resumo por faixa. Hoje isso pegaria 80/80 — o que é a verdade, e é o motivo para fazer A.1 antes de qualquer demo.

- [x] **Task G.6 — Percentual com denominador pequeno não é sinal forte (caso C033).** _(2026-09-20: `janela_observacoes` (default 3) no `zscore_carteira` — média das últimas N observações. C033 medido: risco 50 "alerta" → 19,7 "saudável"; SLA normalizado 100 → 51.)_ Verificado na planilha e no banco (idênticos): em 2026-06 o C033 abriu **1 chamado**, 0 dentro do SLA → `pct_sla_cumprido = 0` é um **zero real**, não NULL (os 23 NULLs da planilha são todos `chamados_abertos = 0` e a ingestão os descarta corretamente — o C033 em 2025-04 não tem linha de SLA no banco). O problema é o que o motor faz com esse zero: `sla_zscore_carteira` usa **só o último mês**; 0 contra média 75,7 / desvio 22,6 dá z = −3,35 → satura em 100 × peso 2 = **200 pontos**. Com as regras de uso/NPS mortas (A.1), o score vira `(200 + 0) / (2 + 2) = 50` → "alerta". **Um chamado perdido em um mês sustenta sozinho o nº 1 da fila por risco.** O mesmo padrão aparece em 25 linhas da base (SLA = 0 com 1–4 chamados).
  _O que fazer (agnóstico, sem saber o que é SLA):_ (1) A.1 devolve os outros 53% do peso e o SLA deixa de ser metade do score; (2) a transformação `nivel` (média de 3 períodos, já prevista em C.3) — para o C033 seria (3+2+0)/(3+5+1) = 55,6%, z ≈ −0,9, não −3,35; (3) D.1 persistência: SLA 0 por um mês é ruído, por dois é sinal. Não fazer: regra específica "se chamados < N ignora SLA" — isso é conhecimento de negócio embutido no motor, e quebra o agnosticismo.

- [x] **Task G.5 — Expor `pontuacao_omissao` na tela de modelo** _(2026-09-20: formulário de nova regra + listagem; junto com `janela_observacoes`. O default por família de métrica não foi implementado — seria conhecimento de negócio no motor; fica a cargo de quem cria a regra.)_ (`lib/motor/modelo.ts` / Configurações) com um default por família: métrica de atendimento (`chamados_*`, `sla`, `tempo_*`) → 0; engajamento (`nps`, `respondeu_*`, `uso`) → 70. É a interface de A.5.

---

## ⛔ Não fazer (medido, e não compensa)

Três mudanças que pareciam certas e que a medição derrubou. Registradas para não serem "corrigidas" por engano depois:

- **Não** trocar a janela da média móvel de 30 dias para 3 meses. Medido: AUC 0,911 vs 0,901, precisão@10 34,4% vs 36,7%. É empate. A janela curta contra todo o histórico anterior já faz o trabalho de delta.

- **Não** "consertar" o descarte de NPS vazio em `lib/ingestao/normalizar.ts:229` imputando nota 0 para quem não respondeu. Medido: derruba o AUC de 0,937 para 0,911. Dos 80 clientes, 56 deixaram de responder ao menos uma vez — tratar isso como detrator é agressivo demais. **O sinal já é capturado corretamente** mapeando a coluna `respondeu` como métrica própria, com peso baixo (5,0), em vez de sequestrar a nota.

- **Não** priorizar a correção da contaminação da carteira (Task D.4). Custo real em precisão dentro da janela de dados: AUC 0,911 → 0,905.

- **Não** construir o Módulo 4 do `TASKS.md` como está especificado — busca vetorial via `pgvector` e RAG de casos históricos (Tasks 4.2 e 4.3). **Com 22 casos, similaridade vetorial é teatro:** um vizinho-mais-próximo sobre as ~12 features numéricas faz a mesma coisa, em SQL, é explicável e não precisa de embeddings de 768 dimensões nem de chamada a API externa. A tabela `casos_historicos_embeddings` pode ficar no schema para depois; o que não se justifica é gastar o tempo do MVP nela enquanto os Módulos A, B e C estão abertos. Revisitar quando houver algumas centenas de desfechos acumulados.

  _Exceção:_ a Task 4.1 (integração com a API do Gemini) continua fazendo sentido, mas para **redigir o texto do alerta** a partir dos motivos já calculados — não para decidir o risco. O risco sai do motor, que é auditável; a IA só verbaliza.

---

## 📌 Ordem sugerida de execução

1. **Módulo A** (A.1 → A.4 → A.5) — 1 dia. Sem isso nada mais importa: A.1 sozinha leva a cobertura de 50% para 100%. Status em 2026-09-20: A.1 e A.5 ainda abertas, A.2/A.4 pela metade (ver tabela no módulo).
2. **Módulo G** (G.1 → G.2 → D.2) — meio dia, **logo depois de A.1** (calibrar prioridade com cobertura 0,5 é calibrar no escuro). É o que faz a fila do dia responder "em que ordem" do jeito que o usuário descreveu.
3. **Módulo B** (B.1 → B.3) — 1 dia. É o que faz a solução passar no teste de completude do PDF.
4. **Módulo C** (C.1 → C.7, depois C.8 → C.11) — 1 a 1,5 dia. É o que transforma "agnóstico" de propriedade do schema em propriedade do produto, e o principal diferencial defensável numa banca. C.1 é uma migration de duas colunas; o miolo (C.2 → C.5) é o módulo novo de verdade.
5. **Módulo F** (F.1, F.2) — meio dia. Alinhar o discurso com o que o dado sustenta antes de qualquer apresentação.
6. **Módulos D e E** — conforme o tempo restante. D.1 (persistência) tem retorno alto e barato; E.1/E.2 têm alto retorno de demonstração (o PDF pede explicitamente o modelo de negócio, pág. 3, e time-to-value de minutos é a resposta).

### Dependências que importam

```
A.1 ──► tudo (sem referência válida, nenhuma medida faz sentido)
C.2 ──► C.3 ──► C.4 ──► C.5 ──► C.6 ──► C.7
                         │
A.2 ─────────────────────┘  (cancelados precisam sair da fila, mas ENTRAR no treino)
C.6 ──► C.11 (a tela de pesos passa a ler do banco)
C.8 ──► A.3 (perda esperada em R$ exige probabilidade E impacto)
D.1 ──► B.3 (meses_em_risco é a feature de persistência exposta na tela)
A.1 ──► G.1 (a fórmula de prioridade foi simulada com cobertura 0,5 — revalidar com 100%)
A.4 ──► tendenciaScore (dedup por dia é o que faz a tendência voltar a existir)
A.5 ──► G.5 (a tela só expõe o que o motor já lê)
C.8 ──► G.1 (com probabilidade calibrada, prioridade = P(evento) × impacto vira R$ de verdade — F.3)
```

**Atenção em A.2 × C.4:** entidades canceladas saem da **fila** e continuam no **treino**. São usos opostos da mesma tabela — não filtrar no lugar errado.

---

## ⚠️ Ressalvas honestas a manter no discurso

- **n = 22 eventos.** AUC 0,937 sobre 22 desfechos tem intervalo de confiança largo, na casa de ±0,05. O número é real, mas não é de precisão cirúrgica. Apresentar **com** a ressalva demonstra domínio; sem ela, é frágil.
- **Os pesos do Módulo C foram ajustados nesta mesma base.** Correto para esta entrega (é o que o PDF pede), mas não são universais — daí a importância da Task C.1.
- **A antecedência real é de 2 a 3 meses**, e isso não muda com nenhuma correção de código. É o que a base tem.
