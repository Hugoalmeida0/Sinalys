graph TD
    classDef setup fill:#f3f4f6,stroke:#6b7280,stroke-width:1px,color:#000;
    classDef calc fill:#e0e7ff,stroke:#4f46e5,stroke-width:1px,color:#000;
    classDef ia fill:#fce8e6,stroke:#ea4335,stroke-width:1px,color:#000;
    classDef front fill:#dcfce7,stroke:#16a34a,stroke-width:1px,color:#000;

    subgraph 1. Setup e Ingestão Agnóstica
    A[Upload de Dados<br>Excel, CSV ou API] --> B(Mapeamento Dinâmico<br>O usuário define o que cada coluna é)
    B --> C[Definição de Regras e Pesos<br>Ex: Atraso tem peso 3]
    end
    
    subgraph 2. Motor Matemático
    C --> D[(Banco de Dados<br>Tabela de Observações)]
    D --> E{Cálculo de Predição}:::calc
    E -->|Risco x Valor do Contrato| F[Fila de Prioridade<br>Score de Urgência]:::calc
    end

    subgraph 3. Inteligência e Contexto
    F --> G[Analista IA<br>Cruza urgência com histórico]:::ia
    H[(Histórico Vetorial<br>Eventos e Desfechos Passados)] -.-> G
    end

    subgraph 4. Ação
    G --> I[Painel de CS<br>Quem atender, por que, e o que fazer]:::front
    I -.->|Feedback: Ação Realizada e Resultado| H
    end