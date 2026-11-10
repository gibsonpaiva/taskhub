-- =============================================================================
-- Adiciona campo "Número do Chamado" (ticket externo) na tabela tasks
-- Execute este script no SQL Editor do Supabase
-- =============================================================================

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ticket_number TEXT;

-- Índice opcional, útil se formos buscar por número de chamado no futuro
CREATE INDEX IF NOT EXISTS idx_tasks_ticket_number ON tasks (ticket_number);
