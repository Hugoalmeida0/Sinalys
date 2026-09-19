BEGIN;

CREATE TABLE organizacoes (
  id uuid PRIMARY KEY, 
  nome text NOT NULL, 
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE projetos (
  id uuid PRIMARY KEY, 
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id),
  nome text NOT NULL, 
  rotulo_entidade text NOT NULL DEFAULT 'Entidade',
  codigo_evento_alvo text NOT NULL,
  horizonte_predicao_dias integer NOT NULL CHECK (horizonte_predicao_dias > 0),
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, organizacao_id)
);

CREATE TABLE entidades (
  id uuid PRIMARY KEY, 
  projeto_id uuid NOT NULL REFERENCES projetos(id),
  id_externo text NOT NULL, 
  nome_exibicao text,
  iniciado_em timestamptz, 
  atributos jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (projeto_id, id), 
  UNIQUE (projeto_id, id_externo)
);

CREATE TABLE definicoes_metricas (
  id uuid PRIMARY KEY, 
  projeto_id uuid NOT NULL REFERENCES projetos(id),
  codigo text NOT NULL, 
  rotulo text NOT NULL,
  tipo_valor text NOT NULL CHECK (tipo_valor IN ('numero', 'texto', 'booleano')),
  unidade text, 
  cadencia text, 
  descricao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (projeto_id, id), 
  UNIQUE (projeto_id, codigo)
);

CREATE TABLE execucoes_ingestao (
  id uuid PRIMARY KEY, 
  projeto_id uuid NOT NULL REFERENCES projetos(id),
  tipo_origem text NOT NULL CHECK (tipo_origem IN ('excel', 'csv', 'api', 'outros')),
  nome_origem text, 
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'processando', 'concluido', 'falhou')),
  metadados jsonb NOT NULL DEFAULT '{}'::jsonb,
  recebido_em timestamptz NOT NULL DEFAULT now(), 
  concluido_em timestamptz,
  detalhes_erro jsonb,
  UNIQUE (projeto_id, id)
);

CREATE TABLE mapeamentos_importacao (
  id uuid PRIMARY KEY, 
  projeto_id uuid NOT NULL, 
  execucao_ingestao_id uuid NOT NULL,
  aba_origem text NOT NULL DEFAULT '', 
  coluna_origem text NOT NULL,
  tipo_destino text NOT NULL CHECK (tipo_destino IN (
    'id_entidade', 'atributo_entidade', 'inicio_entidade', 'data_observacao',
    'metrica', 'codigo_evento', 'data_evento', 'status_evento')),
  campo_destino text, 
  metrica_id uuid,
  config_transformacao jsonb NOT NULL DEFAULT '{}'::jsonb,
  FOREIGN KEY (projeto_id, execucao_ingestao_id) REFERENCES execucoes_ingestao(projeto_id, id),
  FOREIGN KEY (projeto_id, metrica_id) REFERENCES definicoes_metricas(projeto_id, id),
  CHECK ((tipo_destino = 'metrica' AND metrica_id IS NOT NULL)
      OR (tipo_destino <> 'metrica' AND metrica_id IS NULL)),
  UNIQUE (execucao_ingestao_id, aba_origem, coluna_origem)
);

CREATE TABLE observacoes (
  id uuid PRIMARY KEY, 
  projeto_id uuid NOT NULL,
  entidade_id uuid NOT NULL, 
  metrica_id uuid NOT NULL,
  observado_em timestamptz NOT NULL, 
  disponivel_em timestamptz NOT NULL,
  valor_numero numeric(20,6), 
  valor_texto text, 
  valor_booleano boolean,
  execucao_ingestao_id uuid,
  FOREIGN KEY (projeto_id, entidade_id) REFERENCES entidades(projeto_id, id),
  FOREIGN KEY (projeto_id, metrica_id) REFERENCES definicoes_metricas(projeto_id, id),
  FOREIGN KEY (projeto_id, execucao_ingestao_id) REFERENCES execucoes_ingestao(projeto_id, id),
  CONSTRAINT exatamente_um_valor_observacao CHECK (
    (CASE WHEN valor_numero IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN valor_texto IS NULL THEN 0 ELSE 1 END) +
    (CASE WHEN valor_booleano IS NULL THEN 0 ELSE 1 END) = 1
  ),
  UNIQUE (entidade_id, metrica_id, observado_em)
);

CREATE TABLE eventos_desfecho (
  id uuid PRIMARY KEY, 
  projeto_id uuid NOT NULL,
  entidade_id uuid NOT NULL, 
  codigo_evento text NOT NULL,
  ocorrido_em timestamptz NOT NULL, 
  registrado_em timestamptz NOT NULL DEFAULT now(),
  execucao_ingestao_id uuid, 
  detalhes_evento jsonb NOT NULL DEFAULT '{}'::jsonb,
  FOREIGN KEY (projeto_id, entidade_id) REFERENCES entidades(projeto_id, id),
  FOREIGN KEY (projeto_id, execucao_ingestao_id) REFERENCES execucoes_ingestao(projeto_id, id),
  UNIQUE (entidade_id, codigo_evento, ocorrido_em)
);

CREATE TABLE modelos (
  id uuid PRIMARY KEY, 
  projeto_id uuid NOT NULL REFERENCES projetos(id),
  versao integer NOT NULL CHECK (versao > 0),
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'validado', 'ativo', 'arquivado')),
  codigo_evento_alvo text NOT NULL, 
  horizonte_dias integer NOT NULL CHECK (horizonte_dias > 0),
  inicio_treinamento timestamptz, 
  fim_treinamento timestamptz,
  avaliacao jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(), 
  ativado_em timestamptz,
  UNIQUE (projeto_id, id), 
  UNIQUE (projeto_id, versao)
);

CREATE UNIQUE INDEX uq_um_modelo_ativo_por_projeto ON modelos(projeto_id)
  WHERE status = 'ativo';

CREATE TABLE regras_modelo (
  id uuid PRIMARY KEY, 
  projeto_id uuid NOT NULL,
  modelo_id uuid NOT NULL, 
  metrica_id uuid NOT NULL,
  codigo_sinal text NOT NULL, 
  config_regra jsonb NOT NULL,
  peso numeric(12,6) NOT NULL CHECK (peso >= 0),
  FOREIGN KEY (projeto_id, modelo_id) REFERENCES modelos(projeto_id, id),
  FOREIGN KEY (projeto_id, metrica_id) REFERENCES definicoes_metricas(projeto_id, id),
  UNIQUE (modelo_id, codigo_sinal)
);

CREATE TABLE predicoes (
  id uuid PRIMARY KEY, 
  projeto_id uuid NOT NULL,
  entidade_id uuid NOT NULL, 
  modelo_id uuid NOT NULL,
  referencia_em timestamptz NOT NULL,
  pontuacao numeric(7,3) CHECK (pontuacao BETWEEN 0 AND 100),
  faixa_risco text, 
  cobertura numeric(5,4)
    CHECK (cobertura BETWEEN 0 AND 1),
  valor_impacto numeric(20,2),
  calculado_em timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (projeto_id, entidade_id) REFERENCES entidades(projeto_id, id),
  FOREIGN KEY (projeto_id, modelo_id) REFERENCES modelos(projeto_id, id),
  UNIQUE (entidade_id, modelo_id, referencia_em)
);

CREATE TABLE motivos_predicao (
  predicao_id uuid NOT NULL REFERENCES predicoes(id) ON DELETE CASCADE,
  regra_modelo_id uuid NOT NULL REFERENCES regras_modelo(id),
  acionado boolean, -- NULL = nao avaliavel, nao equivale a FALSE
  valor_observado jsonb, 
  pontos numeric(12,6) NOT NULL DEFAULT 0,
  PRIMARY KEY (predicao_id, regra_modelo_id)
);

CREATE INDEX idx_observacoes_asof ON observacoes(entidade_id, metrica_id, observado_em DESC, disponivel_em);
CREATE INDEX idx_eventos_projeto_data ON eventos_desfecho(projeto_id, codigo_evento, ocorrido_em);
CREATE INDEX idx_predicoes_projeto_data ON predicoes(projeto_id, referencia_em DESC, pontuacao DESC);
CREATE INDEX idx_ingestoes_projeto ON execucoes_ingestao(projeto_id, recebido_em DESC);

COMMIT;