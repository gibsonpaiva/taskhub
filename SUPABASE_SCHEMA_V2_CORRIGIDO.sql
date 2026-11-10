-- ============================================================================
-- TASKHUB - SCHEMA NORMALIZADO V2 (CORRIGIDO)
-- Estrutura otimizada para queries, filtros e relatórios
-- ============================================================================

-- 1. TABELA DE USUÁRIOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT,
    initials TEXT,
    avatar_bg TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);

-- Política de acesso público
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to users" ON users;
CREATE POLICY "Allow public access to users"
ON users FOR ALL TO public
USING (true) WITH CHECK (true);

COMMENT ON TABLE users IS 'Usuários do sistema TaskHub';


-- 2. TABELA DE TAREFAS (PRINCIPAL)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Não Iniciada',
    blocked_reason TEXT,
    priority TEXT DEFAULT 'Média',
    system TEXT,
    client TEXT,
    category TEXT,
    deadline TEXT,
    assigned_to_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- Índices para queries e filtros
CREATE INDEX IF NOT EXISTS idx_tasks_code ON tasks(code);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client);
CREATE INDEX IF NOT EXISTS idx_tasks_system ON tasks(system);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status_assigned ON tasks(status, assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_client_status ON tasks(client, status);

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_tasks_search ON tasks 
USING gin(to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(system, '') || ' ' || coalesce(client, '')));

-- Política de acesso
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to tasks" ON tasks;
CREATE POLICY "Allow public access to tasks"
ON tasks FOR ALL TO public
USING (deleted_at IS NULL) 
WITH CHECK (deleted_at IS NULL);

COMMENT ON TABLE tasks IS 'Tarefas do TaskHub';


-- 3. TABELA DE ITENS DA CHECKLIST
-- ============================================================================
CREATE TABLE IF NOT EXISTS checklist_items (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    done BOOLEAN DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_checklist_task_id ON checklist_items(task_id);
CREATE INDEX IF NOT EXISTS idx_checklist_position ON checklist_items(task_id, position);

-- Política de acesso
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to checklist_items" ON checklist_items;
CREATE POLICY "Allow public access to checklist_items"
ON checklist_items FOR ALL TO public
USING (true) WITH CHECK (true);

COMMENT ON TABLE checklist_items IS 'Itens da checklist das tarefas';


-- 4. TABELA DE COMENTÁRIOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_comments_search ON comments 
USING gin(to_tsvector('portuguese', text));

-- Política de acesso
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to comments" ON comments;
CREATE POLICY "Allow public access to comments"
ON comments FOR ALL TO public
USING (true) WITH CHECK (true);

COMMENT ON TABLE comments IS 'Comentários das tarefas';


-- 5. TABELA DE ANEXOS/UPLOADS
-- ============================================================================
CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    url TEXT NOT NULL,
    size TEXT,
    mime_type TEXT,
    storage_path TEXT,
    uploaded_by TEXT,
    uploaded_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by_id ON attachments(uploaded_by_id);
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON attachments(created_at DESC);

-- Política de acesso
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to attachments" ON attachments;
CREATE POLICY "Allow public access to attachments"
ON attachments FOR ALL TO public
USING (true) WITH CHECK (true);

COMMENT ON TABLE attachments IS 'Anexos das tarefas';


-- 6. TABELA DE HISTÓRICO/AUDITORIA
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_audit_task_id ON audit_log(task_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_task_action ON audit_log(task_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_actor_date ON audit_log(actor_id, created_at DESC);

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_audit_search ON audit_log 
USING gin(to_tsvector('portuguese', description));

-- Política de acesso
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to audit_log" ON audit_log;
CREATE POLICY "Allow public access to audit_log"
ON audit_log FOR ALL TO public
USING (true) WITH CHECK (true);

COMMENT ON TABLE audit_log IS 'Histórico completo de todas as ações do sistema';


-- 7. TABELA DE CONFIGURAÇÕES DO SISTEMA
-- ============================================================================
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Política de acesso
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to settings" ON settings;
CREATE POLICY "Allow public access to settings"
ON settings FOR ALL TO public
USING (true) WITH CHECK (true);

COMMENT ON TABLE settings IS 'Configurações gerais do sistema';


-- ============================================================================
-- VIEWS ÚTEIS PARA RELATÓRIOS
-- ============================================================================

-- View: Tarefas com informações completas
CREATE OR REPLACE VIEW v_tasks_full AS
SELECT 
    t.*,
    u.name as assigned_to_name,
    u.email as assigned_to_email,
    creator.name as created_by_name,
    (SELECT COUNT(*) FROM checklist_items WHERE task_id = t.id) as checklist_total,
    (SELECT COUNT(*) FROM checklist_items WHERE task_id = t.id AND done = true) as checklist_done,
    (SELECT COUNT(*) FROM comments WHERE task_id = t.id) as comments_count,
    (SELECT COUNT(*) FROM attachments WHERE task_id = t.id) as attachments_count,
    (SELECT COUNT(*) FROM audit_log WHERE task_id = t.id) as audit_count
FROM tasks t
LEFT JOIN users u ON t.assigned_to_id = u.id
LEFT JOIN users creator ON t.created_by_id = creator.id
WHERE t.deleted_at IS NULL;


-- View: Estatísticas por cliente
CREATE OR REPLACE VIEW v_stats_by_client AS
SELECT 
    client,
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE status = 'Concluída') as completed_tasks,
    COUNT(*) FILTER (WHERE status = 'Em Andamento') as in_progress_tasks,
    COUNT(*) FILTER (WHERE status = 'Bloqueada / Aguardando') as blocked_tasks,
    COUNT(*) FILTER (WHERE status = 'Não Iniciada') as not_started_tasks,
    COUNT(*) FILTER (WHERE priority = 'Crítica') as critical_tasks,
    COUNT(*) FILTER (WHERE priority = 'Alta') as high_priority_tasks
FROM tasks
WHERE deleted_at IS NULL AND client IS NOT NULL AND client != ''
GROUP BY client;


-- View: Histórico completo com joins
CREATE OR REPLACE VIEW v_audit_full AS
SELECT 
    a.*,
    t.code as task_code,
    t.title as task_title,
    t.client as task_client,
    u.name as actor_full_name,
    u.email as actor_email
FROM audit_log a
LEFT JOIN tasks t ON a.task_id = t.id
LEFT JOIN users u ON a.actor_id = u.id
ORDER BY a.created_at DESC;


-- ============================================================================
-- FUNCTIONS E TRIGGERS
-- ============================================================================

-- Function: Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_checklist_updated_at ON checklist_items;
CREATE TRIGGER update_checklist_updated_at
    BEFORE UPDATE ON checklist_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- Function: Busca full-text em tarefas
CREATE OR REPLACE FUNCTION search_tasks(search_query TEXT)
RETURNS TABLE (
    id TEXT,
    code TEXT,
    title TEXT,
    client TEXT,
    status TEXT,
    priority TEXT,
    relevance REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.code,
        t.title,
        t.client,
        t.status,
        t.priority,
        ts_rank(
            to_tsvector('portuguese', coalesce(t.title, '') || ' ' || coalesce(t.description, '') || ' ' || coalesce(t.system, '') || ' ' || coalesce(t.client, '')),
            plainto_tsquery('portuguese', search_query)
        ) as relevance
    FROM tasks t
    WHERE t.deleted_at IS NULL
      AND to_tsvector('portuguese', coalesce(t.title, '') || ' ' || coalesce(t.description, '') || ' ' || coalesce(t.system, '') || ' ' || coalesce(t.client, ''))
          @@ plainto_tsquery('portuguese', search_query)
    ORDER BY relevance DESC;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar tabelas criadas
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as num_columns
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('users', 'tasks', 'checklist_items', 'comments', 'attachments', 'audit_log', 'settings')
ORDER BY table_name;
