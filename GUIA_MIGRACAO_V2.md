# 🚀 Guia de Migração para Banco Normalizado V2

## 📋 O que mudou?

### **Antes (V1):**
- ❌ Tudo em uma tabela `taskhub_storage` (JSONB)
- ❌ Difícil fazer filtros e relatórios
- ❌ Tudo reescrito a cada mudança

### **Agora (V2):**
- ✅ **7 tabelas normalizadas** (users, tasks, checklist_items, comments, attachments, audit_log, settings)
- ✅ **Índices otimizados** para buscas rápidas
- ✅ **Full-text search** em português
- ✅ **Views prontas** para relatórios
- ✅ **Soft delete** (não perde dados)
- ✅ **Triggers automáticos** (updated_at)

---

## 🔥 Passo a Passo da Migração

### **1. Fazer Backup dos Dados Atuais**

No SQL Editor do Supabase:

```sql
-- Backup da tabela antiga
CREATE TABLE taskhub_storage_backup AS 
SELECT * FROM taskhub_storage;

-- Verificar backup
SELECT * FROM taskhub_storage_backup;
```

---

### **2. Criar as Novas Tabelas**

Execute o arquivo `SUPABASE_SCHEMA_V2.sql` completo no SQL Editor.

**Ou copie e cole este resumo:**

```sql
-- Executar todo o conteúdo de SUPABASE_SCHEMA_V2.sql
-- (Arquivo está na raiz do projeto)
```

**Verificar se criou:**

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('users', 'tasks', 'checklist_items', 'comments', 'attachments', 'audit_log', 'settings')
ORDER BY table_name;
```

Deve retornar 7 tabelas.

---

### **3. Migrar os Dados Antigos**

Execute o arquivo `MIGRAR_DADOS_V2.sql`:

```sql
-- Executar todo o conteúdo de MIGRAR_DADOS_V2.sql
-- (Arquivo está na raiz do projeto)
```

**O script vai:**
1. Ler dados de `taskhub_storage`
2. Inserir em cada tabela nova
3. Manter IDs originais (sem perda)
4. Mostrar estatísticas no final

---

### **4. Ativar o Novo DataService no Frontend**

Edite o arquivo `src/main.js`:

**Trocar:**
```javascript
import { db } from './services/dataService.js';
```

**Por:**
```javascript
import { db } from './services/dataServiceV2.js';
```

**Salve o arquivo.**

---

### **5. Testar**

1. **Recarregue a página** do TaskHub
2. Abra o Console (F12) e veja:
   ```
   🔄 Inicializando DataService V2 (tabelas normalizadas)...
   ✅ DataService V2 inicializado
      Usuários: X
      Usuário atual: Gibson Paiva
   ```

3. **Teste as funcionalidades:**
   - ✅ Criar nova tarefa
   - ✅ Editar tarefa existente
   - ✅ Adicionar comentário
   - ✅ Anexar arquivo
   - ✅ Mover tarefa entre colunas
   - ✅ Atualizar checklist

4. **Verificar no Supabase:**

```sql
-- Ver tarefas
SELECT * FROM tasks WHERE deleted_at IS NULL;

-- Ver histórico
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 20;

-- Ver comentários
SELECT * FROM comments ORDER BY created_at DESC LIMIT 10;

-- Ver anexos
SELECT * FROM attachments ORDER BY created_at DESC LIMIT 10;
```

---

## 📊 Queries Úteis (Novos Poderes!)

### **Tarefas por Cliente:**
```sql
SELECT 
    client,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'Concluída') as concluidas
FROM tasks
WHERE deleted_at IS NULL
GROUP BY client
ORDER BY total DESC;
```

### **Histórico Completo de uma Tarefa:**
```sql
SELECT * FROM audit_log
WHERE task_id = 'TASK-ID-AQUI'
ORDER BY created_at DESC;
```

### **Tarefas Criadas Hoje:**
```sql
SELECT code, title, client, status
FROM tasks
WHERE DATE(created_at) = CURRENT_DATE
  AND deleted_at IS NULL;
```

### **Top 5 Usuários Mais Ativos:**
```sql
SELECT 
    actor_name,
    COUNT(*) as acoes
FROM audit_log
GROUP BY actor_name
ORDER BY acoes DESC
LIMIT 5;
```

### **Busca Full-Text:**
```sql
-- Buscar em todas as tarefas
SELECT * FROM search_tasks('networking');

-- Buscar em comentários
SELECT * FROM comments
WHERE to_tsvector('portuguese', text) @@ plainto_tsquery('portuguese', 'problema');
```

### **Tarefas Bloqueadas há Mais de 7 Dias:**
```sql
SELECT 
    code,
    title,
    client,
    blocked_reason,
    updated_at
FROM tasks
WHERE status = 'Bloqueada / Aguardando'
  AND updated_at < NOW() - INTERVAL '7 days'
  AND deleted_at IS NULL;
```

### **Estatísticas por Cliente (View Pronta):**
```sql
SELECT * FROM v_stats_by_client
ORDER BY total_tasks DESC;
```

### **Ver Tarefa Completa com Todos os Detalhes:**
```sql
SELECT * FROM v_tasks_full
WHERE code = 'TASK-101';
```

---

## 🎯 Benefícios da Nova Estrutura

### **1. Performance:**
- ✅ Índices otimizados em todos os campos importantes
- ✅ Queries 10x mais rápidas em grandes volumes
- ✅ Full-text search nativo do PostgreSQL

### **2. Flexibilidade:**
- ✅ Filtrar por qualquer campo (cliente, status, data, etc.)
- ✅ Joins entre tabelas
- ✅ Agregações (COUNT, SUM, AVG)

### **3. Integridade:**
- ✅ Foreign keys garantem consistência
- ✅ Soft delete (dados não são perdidos)
- ✅ Triggers automáticos (updated_at sempre correto)

### **4. Relatórios:**
- ✅ Views prontas para dashboards
- ✅ Histórico completo de tudo
- ✅ Exportação fácil para Excel/CSV

---

## 🔄 Rollback (Se Precisar Voltar)

Se algo der errado, você pode voltar para V1:

### **1. Restaurar dados antigos:**
```sql
-- Restaurar backup
DROP TABLE IF EXISTS taskhub_storage;
CREATE TABLE taskhub_storage AS 
SELECT * FROM taskhub_storage_backup;
```

### **2. Voltar o código:**
```javascript
// Em src/main.js
import { db } from './services/dataService.js'; // V1 (antigo)
```

### **3. Recarregar página**

---

## 📈 Próximos Passos (Futuro)

Com a nova estrutura, você pode facilmente:

### **1. Criar Aba de Relatórios:**
- Gráficos de tarefas por cliente
- Timeline de atividades
- Ranking de usuários
- Tempo médio de conclusão

### **2. Filtros Avançados:**
- Data range (de X até Y)
- Múltiplos clientes
- Tags/categorias
- Status combinados

### **3. Exportações:**
- Excel por cliente
- PDF de relatórios
- CSV para análise externa

### **4. Integrações:**
- Webhooks quando tarefa muda
- API REST completa
- Notificações por email

---

## ✅ Checklist de Migração

```
[ ] 1. Fazer backup dos dados atuais
[ ] 2. Executar SUPABASE_SCHEMA_V2.sql
[ ] 3. Verificar se as 7 tabelas foram criadas
[ ] 4. Executar MIGRAR_DADOS_V2.sql
[ ] 5. Ver estatísticas da migração
[ ] 6. Trocar import no main.js (V1 → V2)
[ ] 7. Recarregar página e testar
[ ] 8. Verificar dados no Supabase
[ ] 9. Testar criar nova tarefa
[ ] 10. Testar editar/comentar/anexar
[ ] 11. Comemorar! 🎉
```

---

## 🆘 Troubleshooting

### **Erro: "relation users does not exist"**
→ Execute o SUPABASE_SCHEMA_V2.sql primeiro

### **Erro: "permission denied"**
→ Verifique as políticas RLS no Supabase

### **Dados antigos não aparecem**
→ Execute MIGRAR_DADOS_V2.sql

### **Console mostra erro de CORS**
→ Adicione o domínio nas configurações do Supabase

---

## 📞 Suporte

Se tiver problemas:
1. Veja os logs do Console (F12)
2. Veja os logs do Supabase (Database → Logs)
3. Execute as queries de verificação acima

---

**Boa migração! 🚀**
