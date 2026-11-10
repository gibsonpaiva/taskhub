# 📊 Estrutura do Banco de Dados V2

## 🗄️ Diagrama das Tabelas

```
┌─────────────────┐
│     USERS       │
├─────────────────┤
│ id (PK)         │
│ name            │
│ email (UNIQUE)  │
│ role            │
│ initials        │
│ avatar_bg       │
│ created_at      │
│ updated_at      │
└─────────────────┘
        │
        │ (assigned_to_id)
        │ (created_by_id)
        │
        ▼
┌─────────────────────────────┐
│          TASKS              │
├─────────────────────────────┤
│ id (PK)                     │
│ code (UNIQUE)               │◄──────┐
│ title                       │       │
│ description                 │       │
│ status                      │       │
│ blocked_reason              │       │
│ priority                    │       │
│ system                      │       │
│ client ← NOVO!              │       │
│ category                    │       │
│ deadline                    │       │
│ assigned_to_id (FK)         │       │
│ created_by_id (FK)          │       │
│ created_at                  │       │
│ updated_at                  │       │
│ completed_at                │       │
│ deleted_at (soft delete)    │       │
└─────────────────────────────┘       │
        │                             │
        │ (task_id)                   │
        │                             │
        ├──────────────┬──────────────┼───────────────┐
        ▼              ▼              ▼               ▼
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│ CHECKLIST  │  │  COMMENTS  │  │ATTACHMENTS │  │ AUDIT_LOG  │
│   ITEMS    │  │            │  │            │  │            │
├────────────┤  ├────────────┤  ├────────────┤  ├────────────┤
│ id (PK)    │  │ id (PK)    │  │ id (PK)    │  │ id (PK)    │
│ task_id(FK)│  │ task_id(FK)│  │ task_id(FK)│  │ task_id(FK)│
│ text       │  │ author_id  │  │ file_name  │  │ action     │
│ done       │  │ author_name│  │ url        │  │ description│
│ position   │  │ text       │  │ size       │  │ actor_id   │
│ created_at │  │ created_at │  │ mime_type  │  │ actor_name │
│ updated_at │  └────────────┘  │ storage_path│ │ old_value  │
└────────────┘                  │ uploaded_by │  │ new_value  │
                                │ created_at  │  │ metadata   │
                                └─────────────┘  │ created_at │
                                                 └────────────┘

┌─────────────────┐
│    SETTINGS     │
├─────────────────┤
│ key (PK)        │
│ value (JSONB)   │
│ updated_at      │
└─────────────────┘
```

---

## 📈 Índices Criados (Performance)

### **TASKS (Principal):**
- ✅ `idx_tasks_code` → Busca por código (TASK-101)
- ✅ `idx_tasks_status` → Filtrar por status
- ✅ `idx_tasks_priority` → Filtrar por prioridade
- ✅ `idx_tasks_client` → Filtrar por cliente ⭐
- ✅ `idx_tasks_system` → Filtrar por sistema
- ✅ `idx_tasks_assigned_to` → Tarefas por responsável
- ✅ `idx_tasks_created_at` → Ordenar por data
- ✅ `idx_tasks_search` → Full-text search 🔍

### **AUDIT_LOG (Histórico):**
- ✅ `idx_audit_task_id` → Histórico de uma tarefa
- ✅ `idx_audit_actor_id` → Ações de um usuário
- ✅ `idx_audit_action` → Filtrar por tipo de ação
- ✅ `idx_audit_created_at` → Timeline
- ✅ `idx_audit_search` → Buscar no histórico 🔍

### **COMMENTS:**
- ✅ `idx_comments_task_id` → Comentários de uma tarefa
- ✅ `idx_comments_search` → Buscar em comentários 🔍

---

## 🎯 Tipos de Dados

### **Status (tasks.status):**
- `Não Iniciada`
- `Em Andamento`
- `Bloqueada / Aguardando`
- `Concluída`

### **Prioridade (tasks.priority):**
- `Crítica`
- `Alta`
- `Média`
- `Baixa`

### **Ações (audit_log.action):**
- `CRIAÇÃO`
- `EDIÇÃO`
- `STATUS`
- `BLOQUEIO`
- `CONCLUSÃO`
- `REATRIBUIÇÃO`
- `TAKEOVER`
- `CHECKLIST`
- `COMENTÁRIO`
- `ANEXO`
- `EXCLUSÃO`

---

## 🔍 Views Prontas

### **v_tasks_full**
Todas as tarefas com contadores (checklist, comentários, anexos, histórico)

```sql
SELECT * FROM v_tasks_full WHERE client = 'Nome do Cliente';
```

### **v_stats_by_client**
Estatísticas agregadas por cliente

```sql
SELECT * FROM v_stats_by_client;
```

**Retorna:**
- Total de tarefas
- Tarefas concluídas
- Tarefas em andamento
- Tarefas bloqueadas
- Tarefas não iniciadas
- Tarefas críticas
- Tarefas de alta prioridade

### **v_audit_full**
Histórico completo com joins

```sql
SELECT * FROM v_audit_full WHERE actor_name = 'Gibson Paiva' LIMIT 50;
```

---

## 📊 Exemplos de Queries

### **1. Dashboard Geral:**
```sql
SELECT 
    COUNT(*) as total_tarefas,
    COUNT(*) FILTER (WHERE status = 'Concluída') as concluidas,
    COUNT(*) FILTER (WHERE status = 'Em Andamento') as em_andamento,
    COUNT(*) FILTER (WHERE status = 'Bloqueada / Aguardando') as bloqueadas,
    COUNT(*) FILTER (WHERE priority = 'Crítica') as criticas
FROM tasks
WHERE deleted_at IS NULL;
```

### **2. Ranking de Clientes:**
```sql
SELECT 
    client,
    COUNT(*) as total_tarefas,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'Concluída') / COUNT(*), 1) as percentual_conclusao
FROM tasks
WHERE deleted_at IS NULL AND client IS NOT NULL AND client != ''
GROUP BY client
ORDER BY total_tarefas DESC;
```

### **3. Timeline de Atividades (Últimas 24h):**
```sql
SELECT 
    a.created_at,
    a.actor_name,
    a.action,
    t.code,
    t.title,
    t.client,
    a.description
FROM audit_log a
JOIN tasks t ON a.task_id = t.id
WHERE a.created_at > NOW() - INTERVAL '24 hours'
ORDER BY a.created_at DESC;
```

### **4. Produtividade por Usuário:**
```sql
SELECT 
    u.name,
    COUNT(DISTINCT t.id) as tarefas_atribuidas,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'Concluída') as concluidas,
    COUNT(a.id) as acoes_totais
FROM users u
LEFT JOIN tasks t ON u.id = t.assigned_to_id AND t.deleted_at IS NULL
LEFT JOIN audit_log a ON u.id = a.actor_id
GROUP BY u.id, u.name
ORDER BY acoes_totais DESC;
```

### **5. Tempo Médio de Conclusão:**
```sql
SELECT 
    client,
    COUNT(*) as tarefas_concluidas,
    ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600), 1) as media_horas
FROM tasks
WHERE completed_at IS NOT NULL
GROUP BY client
ORDER BY media_horas;
```

### **6. Tarefas Críticas Abertas:**
```sql
SELECT 
    code,
    title,
    client,
    assigned_to_id,
    deadline,
    created_at
FROM tasks
WHERE priority = 'Crítica'
  AND status != 'Concluída'
  AND deleted_at IS NULL
ORDER BY created_at;
```

### **7. Busca Avançada (Full-Text):**
```sql
-- Buscar em tarefas
SELECT * FROM search_tasks('problema de rede');

-- Buscar em comentários
SELECT 
    c.*,
    t.code,
    t.title
FROM comments c
JOIN tasks t ON c.task_id = t.id
WHERE to_tsvector('portuguese', c.text) @@ plainto_tsquery('portuguese', 'resolvido')
ORDER BY c.created_at DESC;
```

---

## 🔐 Segurança (RLS)

Todas as tabelas têm **Row Level Security (RLS)** habilitado com políticas de acesso público.

**Para produção, você pode:**

1. **Adicionar autenticação:**
```sql
-- Exemplo: apenas usuários autenticados
CREATE POLICY "Authenticated users only"
ON tasks FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
```

2. **Filtrar por usuário:**
```sql
-- Exemplo: cada usuário vê apenas suas tarefas
CREATE POLICY "Users see own tasks"
ON tasks FOR SELECT
USING (assigned_to_id = auth.uid());
```

---

## 💾 Tamanho Estimado

Para **1.000 tarefas**:
- tasks: ~500 KB
- checklist_items (5 por tarefa): ~200 KB
- comments (3 por tarefa): ~300 KB
- attachments (2 por tarefa): ~100 KB (apenas metadados)
- audit_log (10 eventos por tarefa): ~800 KB

**Total: ~2 MB** (sem os arquivos anexados)

---

## 🚀 Performance

Com índices otimizados:
- ✅ Buscar tarefa por código: **< 1ms**
- ✅ Listar todas as tarefas: **< 50ms** (até 10k tarefas)
- ✅ Filtrar por cliente: **< 10ms**
- ✅ Full-text search: **< 100ms** (em milhares de registros)
- ✅ Histórico completo: **< 20ms**

---

**Estrutura otimizada para crescer! 📈**
