-- ============================================================================
-- SCRIPT DE MIGRAÇÃO: JSONB → TABELAS NORMALIZADAS
-- Execute APÓS criar o schema V2
-- ============================================================================

-- Este script extrai os dados do formato antigo (JSONB em taskhub_storage)
-- e os insere nas novas tabelas normalizadas

-- IMPORTANTE: Faça backup antes de executar!
-- SELECT * FROM taskhub_storage; -- backup

DO $$
DECLARE
    old_data JSONB;
    user_record JSONB;
    task_record JSONB;
    checklist_item JSONB;
    comment_record JSONB;
    attachment_record JSONB;
    audit_record JSONB;
BEGIN
    -- Carregar dados antigos
    SELECT value INTO old_data FROM taskhub_storage WHERE key = 'app_state';
    
    IF old_data IS NULL THEN
        RAISE NOTICE 'Nenhum dado antigo encontrado. Pulando migração.';
        RETURN;
    END IF;

    RAISE NOTICE 'Iniciando migração...';

    -- ========================================================================
    -- 1. MIGRAR USUÁRIOS
    -- ========================================================================
    RAISE NOTICE 'Migrando usuários...';
    
    FOR user_record IN SELECT * FROM jsonb_array_elements(old_data->'users')
    LOOP
        INSERT INTO users (id, name, email, role, initials, avatar_bg)
        VALUES (
            user_record->>'id',
            user_record->>'name',
            user_record->>'email',
            user_record->>'role',
            user_record->>'initials',
            user_record->>'avatarBg'
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            initials = EXCLUDED.initials,
            avatar_bg = EXCLUDED.avatar_bg,
            updated_at = NOW();
    END LOOP;

    -- ========================================================================
    -- 2. MIGRAR TAREFAS
    -- ========================================================================
    RAISE NOTICE 'Migrando tarefas...';
    
    FOR task_record IN SELECT * FROM jsonb_array_elements(old_data->'tasks')
    LOOP
        INSERT INTO tasks (
            id, code, title, description, status, blocked_reason, priority,
            system, client, category, deadline, assigned_to_id, created_at,
            updated_at, completed_at
        )
        VALUES (
            task_record->>'id',
            task_record->>'code',
            task_record->>'title',
            task_record->>'description',
            task_record->>'status',
            task_record->>'blockedReason',
            task_record->>'priority',
            task_record->>'system',
            COALESCE(task_record->>'client', ''),
            task_record->>'category',
            task_record->>'deadline',
            task_record->>'assignedToId',
            (task_record->>'createdAt')::TIMESTAMPTZ,
            (task_record->>'updatedAt')::TIMESTAMPTZ,
            (task_record->>'completedAt')::TIMESTAMPTZ
        )
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            status = EXCLUDED.status,
            blocked_reason = EXCLUDED.blocked_reason,
            priority = EXCLUDED.priority,
            system = EXCLUDED.system,
            client = EXCLUDED.client,
            category = EXCLUDED.category,
            deadline = EXCLUDED.deadline,
            assigned_to_id = EXCLUDED.assigned_to_id,
            updated_at = EXCLUDED.updated_at,
            completed_at = EXCLUDED.completed_at;

        -- ====================================================================
        -- 2.1 MIGRAR CHECKLIST DA TAREFA
        -- ====================================================================
        FOR checklist_item IN SELECT * FROM jsonb_array_elements(task_record->'checklist')
        LOOP
            INSERT INTO checklist_items (id, task_id, text, done)
            VALUES (
                checklist_item->>'id',
                task_record->>'id',
                checklist_item->>'text',
                (checklist_item->>'done')::BOOLEAN
            )
            ON CONFLICT (id) DO UPDATE SET
                text = EXCLUDED.text,
                done = EXCLUDED.done,
                updated_at = NOW();
        END LOOP;

        -- ====================================================================
        -- 2.2 MIGRAR COMENTÁRIOS DA TAREFA
        -- ====================================================================
        FOR comment_record IN SELECT * FROM jsonb_array_elements(task_record->'comments')
        LOOP
            INSERT INTO comments (id, task_id, author_id, author_name, text, created_at)
            VALUES (
                comment_record->>'id',
                task_record->>'id',
                comment_record->>'authorId',
                comment_record->>'authorName',
                comment_record->>'text',
                (comment_record->>'createdAt')::TIMESTAMPTZ
            )
            ON CONFLICT (id) DO NOTHING;
        END LOOP;

        -- ====================================================================
        -- 2.3 MIGRAR ANEXOS DA TAREFA
        -- ====================================================================
        FOR attachment_record IN SELECT * FROM jsonb_array_elements(task_record->'attachments')
        LOOP
            INSERT INTO attachments (id, task_id, file_name, url, size, uploaded_by, created_at)
            VALUES (
                attachment_record->>'id',
                task_record->>'id',
                attachment_record->>'fileName',
                attachment_record->>'url',
                attachment_record->>'size',
                attachment_record->>'uploadedBy',
                (attachment_record->>'createdAt')::TIMESTAMPTZ
            )
            ON CONFLICT (id) DO NOTHING;
        END LOOP;

        -- ====================================================================
        -- 2.4 MIGRAR HISTÓRICO/AUDIT DA TAREFA
        -- ====================================================================
        FOR audit_record IN SELECT * FROM jsonb_array_elements(task_record->'auditLog')
        LOOP
            INSERT INTO audit_log (id, task_id, action, description, actor_name, created_at)
            VALUES (
                audit_record->>'id',
                task_record->>'id',
                audit_record->>'action',
                audit_record->>'description',
                audit_record->>'actorName',
                (audit_record->>'timestamp')::TIMESTAMPTZ
            )
            ON CONFLICT (id) DO NOTHING;
        END LOOP;
    END LOOP;

    -- ========================================================================
    -- 3. MIGRAR CONFIGURAÇÕES
    -- ========================================================================
    RAISE NOTICE 'Migrando configurações...';
    
    INSERT INTO settings (key, value)
    VALUES ('app_settings', old_data->'settings')
    ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW();

    -- Salvar o current_user
    INSERT INTO settings (key, value)
    VALUES ('current_user_id', to_jsonb((old_data->'currentUser'->>'id')::TEXT))
    ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW();

    RAISE NOTICE 'Migração concluída com sucesso!';
    
    -- Estatísticas
    RAISE NOTICE '============================================';
    RAISE NOTICE 'RESUMO DA MIGRAÇÃO:';
    RAISE NOTICE 'Usuários: % registros', (SELECT COUNT(*) FROM users);
    RAISE NOTICE 'Tarefas: % registros', (SELECT COUNT(*) FROM tasks WHERE deleted_at IS NULL);
    RAISE NOTICE 'Checklist: % itens', (SELECT COUNT(*) FROM checklist_items);
    RAISE NOTICE 'Comentários: % registros', (SELECT COUNT(*) FROM comments);
    RAISE NOTICE 'Anexos: % arquivos', (SELECT COUNT(*) FROM attachments);
    RAISE NOTICE 'Histórico: % eventos', (SELECT COUNT(*) FROM audit_log);
    RAISE NOTICE '============================================';

END $$;


-- ============================================================================
-- VERIFICAÇÕES PÓS-MIGRAÇÃO
-- ============================================================================

-- Verificar se todos os dados foram migrados corretamente
SELECT 
    'users' as tabela,
    COUNT(*) as registros
FROM users
UNION ALL
SELECT 'tasks', COUNT(*) FROM tasks WHERE deleted_at IS NULL
UNION ALL
SELECT 'checklist_items', COUNT(*) FROM checklist_items
UNION ALL
SELECT 'comments', COUNT(*) FROM comments
UNION ALL
SELECT 'attachments', COUNT(*) FROM attachments
UNION ALL
SELECT 'audit_log', COUNT(*) FROM audit_log
ORDER BY tabela;

-- Ver tarefas migradas
SELECT id, code, title, client, status, priority FROM tasks WHERE deleted_at IS NULL LIMIT 10;
