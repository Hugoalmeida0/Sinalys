-- Habilita Row Level Security em todas as tabelas do schema public.
--
-- Contexto: hoje todas as rotas de API (app/api/**) usam
-- `criarClienteSupabaseAdmin()` (service_role), que ignora RLS — então nada no
-- app quebra com isso. O problema que isto corrige é outro: a chave pública
-- (NEXT_PUBLIC_SUPABASE_ANON_KEY), que fica no bundle do browser, dava acesso
-- de leitura/escrita irrestrito a QUALQUER linha de QUALQUER tabela para
-- qualquer pessoa que a inspecionasse (finding "rls_disabled_in_public",
-- severidade ERROR, nas 16 tabelas do projeto).
--
-- Política adotada para o MVP: só a role `authenticated` (usuário com sessão
-- válida via Supabase Auth) pode ler/escrever, por qualquer meio que não seja
-- o service_role. Não existe hoje uma tabela de vínculo usuário↔organização
-- (login é single-tenant, projeto fixo via DEFAULT_PROJETO_ID), então a
-- policy não filtra por projeto/organização ainda — isso é o próximo passo
-- natural quando o app ganhar multi-tenant real (Task 5.x). O que isto já
-- garante: acesso anônimo (chave pública sem login) fica bloqueado por padrão
-- em toda tabela, o que é a lacuna de segurança que o advisor apontou.

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

-- Uma policy idêntica por tabela: exige sessão autenticada para qualquer
-- operação. `TO authenticated` já nega a role `anon` por padrão (Postgres nega
-- o que não tem policy correspondente), então não é preciso negar `anon`
-- explicitamente.
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
