-- =============================================================================
-- Correções de segurança encontradas na validação do ambiente Supabase (11/11/2026)
-- Execute no SQL Editor do Supabase. Pode rodar o arquivo inteiro de uma vez.
-- Nenhum destes comandos apaga dados; são apenas permissões de acesso.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) VAZAMENTO CRÍTICO: as views de relatório rodam com o dono da view (o
--    superusuário do Supabase), então elas IGNORAM o RLS das tabelas tasks/
--    audit_log/users. Resultado hoje: qualquer visitante, sem login, usando só
--    a chave pública que já está no JS do site, lê TODAS as tarefas e TODO o
--    histórico de auditoria — incluindo nome e e-mail de quem fez cada ação —
--    direto em:
--      {SUPABASE_URL}/rest/v1/v_tasks_full
--      {SUPABASE_URL}/rest/v1/v_audit_full
--      {SUPABASE_URL}/rest/v1/v_stats_by_client
--    O app não usa essas views hoje. Tiramos o acesso de quem não está logado
--    E de quem está logado (nada no código as consome). Se um dia quiser usá-
--    -las para relatórios dentro do app, troque o REVOKE por um GRANT SELECT
--    só para "authenticated" depois de revisar o que cada view expõe.
REVOKE ALL ON v_tasks_full FROM PUBLIC, anon, authenticated;
REVOKE ALL ON v_stats_by_client FROM PUBLIC, anon, authenticated;
REVOKE ALL ON v_audit_full FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2) Tabelas da versão antiga (V1), que o app não usa mais — main.js importa
--    dataServiceV2.js, não dataService.js. Elas ainda têm a política original
--    "liberado para todo mundo" de antes da migração e guardam uma cópia real
--    (porém desatualizada) dos dados das tarefas. Hoje são públicas: qualquer
--    um com a chave pública lê (e, pela política, também escreve). Tranca o
--    acesso sem apagar nada, por segurança.
ALTER TABLE IF EXISTS taskhub_storage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to taskhub_storage" ON taskhub_storage;

ALTER TABLE IF EXISTS taskhub_storage_backup ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS taskhub_uploads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to taskhub_uploads" ON taskhub_uploads;

-- -----------------------------------------------------------------------------
-- 3) Ajuste menor: a política "Somente logados" (criada em
--    SUPABASE_AUTH_SETUP.sql) substituiu a política original de "tasks" e,
--    nessa troca, perdeu o filtro que escondia tarefas excluídas
--    (deleted_at IS NULL). Hoje, qualquer colega logado que chame a API
--    diretamente (sem passar pela tela do app) vê as tarefas já excluídas.
--    Restaura o filtro, mantendo o UPDATE liberado para o soft-delete
--    (marcar deleted_at) continuar funcionando normalmente.
DROP POLICY IF EXISTS "Somente logados" ON tasks;
CREATE POLICY "Somente logados"
ON tasks FOR ALL TO authenticated
USING (deleted_at IS NULL)
WITH CHECK (true);

-- =============================================================================
-- Verificação depois de rodar (rode no terminal, fora do SQL Editor):
--   curl "<SUPABASE_URL>/rest/v1/v_audit_full"  -H "apikey: <chave publica>"
--   curl "<SUPABASE_URL>/rest/v1/taskhub_storage" -H "apikey: <chave publica>"
-- Os dois devem voltar vazios ([]) ou com erro de permissão — nunca mais com
-- dados reais.
-- =============================================================================
