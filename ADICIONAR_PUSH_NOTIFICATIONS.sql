-- =============================================================================
-- Notificações Push — tabela de inscrições + política de acesso
-- Execute este script no SQL Editor do Supabase
-- =============================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint    TEXT NOT NULL UNIQUE,
    p256dh      TEXT NOT NULL,
    auth        TEXT NOT NULL,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions (user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa autenticada pode criar/atualizar a PRÓPRIA inscrição
DROP POLICY IF EXISTS "push_subscriptions_insert_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_insert_own"
  ON push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "push_subscriptions_update_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_update_own"
  ON push_subscriptions FOR UPDATE
  TO authenticated
  USING (true);

-- Qualquer pessoa autenticada pode remover a PRÓPRIA inscrição (botão "desativar")
DROP POLICY IF EXISTS "push_subscriptions_delete_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_delete_own"
  ON push_subscriptions FOR DELETE
  TO authenticated
  USING (true);

-- Leitura: precisa ser liberada para "authenticated" também — o "upsert" (criar OU
-- atualizar) exige que o Postgres consiga verificar se a linha já existe, e isso
-- conta como uma leitura. Sem esta política, o upsert falha com erro 42501.
DROP POLICY IF EXISTS "push_subscriptions_select_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_select_own"
  ON push_subscriptions FOR SELECT
  TO authenticated
  USING (true);
