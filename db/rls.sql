BEGIN;

ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.definicoes_metricas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execucoes_ingestao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapeamentos_importacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_desfecho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_modelo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motivos_predicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casos_historicos_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosticos_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.silenciamentos_alerta ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tabela text;
BEGIN
  FOR tabela IN
    SELECT unnest(ARRAY[
      'organizacoes', 'projetos', 'entidades', 'definicoes_metricas',
      'execucoes_ingestao', 'mapeamentos_importacao', 'observacoes',
      'eventos_desfecho', 'modelos', 'regras_modelo', 'predicoes',
      'motivos_predicao', 'casos_historicos_embeddings', 'diagnosticos_ia',
      'contatos', 'silenciamentos_alerta'
    ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "authenticated_full_access" ON public.%I
         FOR ALL
         TO authenticated
         USING (true)
         WITH CHECK (true);',
      tabela
    );
  END LOOP;
END $$;

COMMIT;
