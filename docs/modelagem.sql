BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

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

-- Histórico vetorizado de casos (RAG / busca lookalike). Cada linha consolida o
-- contexto textual de um cliente em um dado momento + a ação tomada + o desfecho
-- observado, embutido em `embedding` para recuperação por similaridade (rotas
-- POST /api/inteligencia/feedback e POST /api/inteligencia/analisar).
-- Dimensão 768: `gemini-embedding-001` é nativamente 3072-D e é truncado via
-- `outputDimensionality` (o `text-embedding-004` original foi retirado da API).
-- Os vetores são gravados normalizados (norma 1) por lib/ia/embeddings.ts.
CREATE TABLE casos_historicos_embeddings (
  id uuid PRIMARY KEY,
  projeto_id uuid NOT NULL,
  entidade_id uuid NOT NULL,
  evento_desfecho_id uuid,
  contexto_texto text NOT NULL,
  acao_realizada text NOT NULL,
  desfecho text NOT NULL CHECK (desfecho IN ('recuperado', 'cancelado')),
  embedding vector(768) NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (projeto_id, entidade_id) REFERENCES entidades(projeto_id, id),
  FOREIGN KEY (evento_desfecho_id) REFERENCES eventos_desfecho(id)
);

CREATE INDEX idx_casos_historicos_embedding ON casos_historicos_embeddings
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_casos_historicos_projeto ON casos_historicos_embeddings(projeto_id, criado_em DESC);

CREATE INDEX idx_observacoes_asof ON observacoes(entidade_id, metrica_id, observado_em DESC, disponivel_em);
CREATE INDEX idx_eventos_projeto_data ON eventos_desfecho(projeto_id, codigo_evento, ocorrido_em);
CREATE INDEX idx_predicoes_projeto_data ON predicoes(projeto_id, referencia_em DESC, pontuacao DESC);
CREATE INDEX idx_ingestoes_projeto ON execucoes_ingestao(projeto_id, recebido_em DESC);

-- Destino do diagnóstico/plano de ação gerado pelo LLM (Módulo 4, Task 4.3).
-- Mantém histórico: N diagnósticos por predição, para o painel ler sem
-- re-chamar o Gemini e para o Vercel Cron (Task 5.4) gravar suas varreduras.
CREATE TABLE diagnosticos_ia (
  id uuid PRIMARY KEY,
  projeto_id uuid NOT NULL,
  entidade_id uuid NOT NULL,
  predicao_id uuid NOT NULL REFERENCES predicoes(id) ON DELETE CASCADE,
  diagnostico_principal text NOT NULL,
  analise_lookalike text NOT NULL,
  plano_acao_imediato jsonb NOT NULL,
  -- Rastreabilidade do RAG: quais casos alimentaram este diagnóstico e com que
  -- similaridade, para auditar a recomendação depois.
  casos_similares jsonb NOT NULL DEFAULT '[]'::jsonb,
  modelo_ia text NOT NULL,
  modelo_embedding text NOT NULL,
  origem_gatilho text NOT NULL DEFAULT 'manual'
    CHECK (origem_gatilho IN ('manual', 'cron')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (projeto_id, entidade_id) REFERENCES entidades(projeto_id, id),
  CONSTRAINT plano_acao_e_lista CHECK (jsonb_typeof(plano_acao_imediato) = 'array')
);

CREATE INDEX idx_diagnosticos_ia_entidade
  ON diagnosticos_ia(projeto_id, entidade_id, criado_em DESC);
CREATE INDEX idx_diagnosticos_ia_predicao ON diagnosticos_ia(predicao_id);

-- Busca lookalike por distância de cosseno (Task 4.2), consumida por
-- lib/ia/lookalike.ts via `supabase.rpc`. Ordenação e corte acontecem aqui para
-- que o índice HNSW seja usado em vez de trazer a base para a aplicação.
CREATE OR REPLACE FUNCTION buscar_casos_similares(
  p_projeto_id uuid,
  p_embedding vector(768),
  p_limite integer DEFAULT 3,
  p_entidade_excluida uuid DEFAULT NULL,
  p_similaridade_minima double precision DEFAULT 0
)
RETURNS TABLE (
  id uuid, entidade_id uuid, nome_exibicao text, contexto_texto text,
  acao_realizada text, desfecho text, similaridade double precision,
  criado_em timestamptz
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT c.id, c.entidade_id, e.nome_exibicao, c.contexto_texto,
         c.acao_realizada, c.desfecho,
         -- <=> é distância cosseno (0 = idêntico); 1 - distância = similaridade.
         1 - (c.embedding OPERATOR(public.<=>) p_embedding) AS similaridade,
         c.criado_em
  FROM public.casos_historicos_embeddings c
  JOIN public.entidades e
    ON e.projeto_id = c.projeto_id AND e.id = c.entidade_id
  WHERE c.projeto_id = p_projeto_id
    AND (p_entidade_excluida IS NULL OR c.entidade_id <> p_entidade_excluida)
    AND 1 - (c.embedding OPERATOR(public.<=>) p_embedding) >= p_similaridade_minima
  ORDER BY c.embedding OPERATOR(public.<=>) p_embedding
  LIMIT greatest(p_limite, 0);
$$;

-- Registro de contatos humanos com o cliente (Task 5.3 / KPI "clientes contatados").
-- Alimenta o KPI de contatados nos últimos 7 dias e o histórico da tela de detalhe.
CREATE TABLE contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL,
  entidade_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN (
    'ligacao', 'reuniao_presencial', 'videochamada', 'email', 'whatsapp', 'outro')),
  realizado_em timestamptz NOT NULL,
  resumo text NOT NULL,
  proximo_passo text,
  proximo_passo_em timestamptz,
  -- Quem registrou (auth.users.id). Sem FK para auth: usuário pode ser removido.
  autor_usuario_id uuid,
  autor_nome text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (projeto_id, entidade_id) REFERENCES entidades(projeto_id, id)
);

CREATE INDEX idx_contatos_projeto_data ON contatos(projeto_id, realizado_em DESC);
CREATE INDEX idx_contatos_entidade_data ON contatos(entidade_id, realizado_em DESC);

-- "Silenciar alertas": tira o cliente da fila do dia até `silenciado_ate`.
-- Histórico preservado (uma linha por silenciamento); o vigente é o de maior
-- `silenciado_ate` ainda no futuro.
CREATE TABLE silenciamentos_alerta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL,
  entidade_id uuid NOT NULL,
  silenciado_ate timestamptz NOT NULL,
  motivo text,
  autor_usuario_id uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (projeto_id, entidade_id) REFERENCES entidades(projeto_id, id)
);

CREATE INDEX idx_silenciamentos_projeto_vigencia
  ON silenciamentos_alerta(projeto_id, silenciado_ate DESC);
CREATE INDEX idx_silenciamentos_entidade ON silenciamentos_alerta(entidade_id);

COMMIT;

-- RLS: ver docs/rls.sql (já aplicado ao banco). Resumo: todas as tabelas têm
-- RLS habilitado; só a role `authenticated` (sessão válida) pode ler/escrever
-- por fora do service_role. Sem filtro por organização/projeto ainda — não há
-- tabela de vínculo usuário↔projeto hoje (login é single-tenant). Filtrar por
-- tenant é o próximo passo quando o multi-tenant real existir.
