
# 📥 Bloco de Ingestão e Mapeamento Agnóstico

O subsistema de ingestão é responsável por tornar a plataforma completamente flexível, permitindo que qualquer usuário faça o upload de uma base de dados externa (Excel ou CSV) sem exigir uma estrutura de colunas fixa ou pré-programada.

O fluxo de processamento e adaptação opera em três etapas:

### 1. Recepção e Inspeção do Arquivo

* O usuário realiza o upload do arquivo (`execucoes_ingestao`). O sistema lê as abas e os cabeçalhos das colunas de forma dinâmica, sem validar nomes fixos como "sla", "nps" ou "atraso".
* O arquivo bruto é armazenado temporariamente para rastreabilidade, permitindo auditar erros de formato caso o envio falhe.

### 2. Mapeamento Dinâmico (De-Para)

* O sistema apresenta uma interface de parametrização onde o usuário correlaciona as colunas do arquivo dele com o motor do sistema (`mapeamentos_importacao`).
* O usuário define a finalidade de cada coluna:
  * **Identificador da Entidade:** Qual coluna representa o ID único do cliente/objeto (ex: `cliente_id`).
  * **Data de Observação:** Qual coluna dita a referência temporal do dado (ex: `mes_ref`).
  * **Métricas Customizadas:** Quais colunas representam indicadores de comportamento (ex: "dias de atraso", "taxa de uso", "abandono de carrinho"), especificando o seu tipo de dado (`numero`, `texto` ou `booleano`).

### 3. Normalização e Gravação Universal

* Com o mapeamento definido, o motor ignora os nomes originais das colunas do arquivo e converte todas as linhas de métricas para o formato padrão e universal na tabela de `observacoes`.
* A partir desse momento, o motor matemático e o bloco de inteligência passam a enxergar os novos dados perfeitamente, calculando riscos, pesos e tendências sem que tenha sido necessário alterar uma única linha de código no backend.
