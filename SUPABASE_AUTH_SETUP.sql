-- =============================================================================
-- TASKHUB — LOGIN (Supabase Auth)
-- Rode no Supabase: SQL Editor. Cada passo é independente; leia antes de rodar.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- PASSO 1 (OBRIGATÓRIO, ANTES do seu primeiro login)
-- Liga o SEU e-mail de login ao usuário que já tem as suas tarefas.
-- O app procura o perfil pelo e-mail. Se não achar, cria um perfil novo e vazio
-- (aí você entraria sem as suas tarefas atribuídas).
-- Troque SEU_EMAIL_AQUI pelo e-mail que você vai usar para entrar.
-- Para os outros usuários da equipe, repita com o id deles (veja: SELECT id, name, email FROM users;)
-- -----------------------------------------------------------------------------
UPDATE users
SET email = lower('SEU_EMAIL_AQUI')
WHERE id = 'usr-1';


-- -----------------------------------------------------------------------------
-- PASSO 2 (RECOMENDADO, rode DEPOIS de conseguir entrar no app)
-- Hoje as tabelas aceitam leitura e escrita de QUALQUER pessoa que tenha a chave
-- pública do app (política "TO public"). A tela de login sozinha não protege os dados.
-- Este passo troca isso por "somente quem está logado".
-- Remove TODAS as políticas atuais dessas tabelas e cria uma nova.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
  tbl TEXT;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('users','tasks','checklist_items','comments','attachments','audit_log','settings')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;

  FOREACH tbl IN ARRAY ARRAY['users','tasks','checklist_items','comments','attachments','audit_log','settings']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY "Somente logados" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END $$;

-- Arquivos (bucket taskhub-uploads): só logados enviam, listam e apagam.
-- O bucket continua "público" apenas para abrir a imagem pelo link.
DROP POLICY IF EXISTS "Public Access to taskhub-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Delete taskhub-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Somente logados taskhub-uploads" ON storage.objects;
CREATE POLICY "Somente logados taskhub-uploads"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'taskhub-uploads')
WITH CHECK (bucket_id = 'taskhub-uploads');


-- -----------------------------------------------------------------------------
-- PARA DESFAZER o passo 2 (volta a liberar para todos):
--   rode de novo o SUPABASE_SCHEMA_V2_CORRIGIDO.sql (recria as políticas "Allow public access")
--   e o bloco de storage de SUPABASE_SETUP.md.
-- -----------------------------------------------------------------------------
