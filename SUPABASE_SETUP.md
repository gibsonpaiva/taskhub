# Configuração do Supabase para TaskHub

## 1. Criar as Tabelas no Supabase

Acesse o **SQL Editor** no painel do Supabase e execute os scripts abaixo:

### Tabela Principal (taskhub_storage)

```sql
-- Criar tabela principal para armazenar o estado da aplicação
CREATE TABLE taskhub_storage (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE taskhub_storage ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso completo (ajuste conforme necessidade)
CREATE POLICY "Allow all access to taskhub_storage" 
ON taskhub_storage 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Índice para melhorar performance
CREATE INDEX idx_taskhub_storage_updated_at ON taskhub_storage(updated_at DESC);

-- Comentário descritivo
COMMENT ON TABLE taskhub_storage IS 'Armazena o estado completo da aplicação TaskHub em formato JSON';
```

### Tabela de Uploads (opcional, para metadados)

```sql
-- Criar tabela para rastrear uploads de arquivos
CREATE TABLE taskhub_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    size_bytes BIGINT,
    mime_type TEXT,
    uploaded_by TEXT,
    task_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE taskhub_uploads ENABLE ROW LEVEL SECURITY;

-- Política de acesso
CREATE POLICY "Allow all access to taskhub_uploads" 
ON taskhub_uploads 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Índices
CREATE INDEX idx_taskhub_uploads_created_at ON taskhub_uploads(created_at DESC);
CREATE INDEX idx_taskhub_uploads_task_id ON taskhub_uploads(task_id);

COMMENT ON TABLE taskhub_uploads IS 'Metadados dos arquivos anexados às tarefas';
```

## 2. Criar Storage Bucket

1. No painel do Supabase, vá em **Storage**
2. Clique em **Create a new bucket**
3. Configure:
   - **Name:** `taskhub-uploads`
   - **Public bucket:** ✓ (marque como público)
   - Clique em **Create bucket**

### Configurar Política de Acesso ao Storage

No SQL Editor, execute:

```sql
-- Permitir acesso público ao bucket de uploads
CREATE POLICY "Public Access to taskhub-uploads"
ON storage.objects FOR ALL
TO public
USING (bucket_id = 'taskhub-uploads')
WITH CHECK (bucket_id = 'taskhub-uploads');
```

## 3. Variáveis de Ambiente

As credenciais já estão configuradas no arquivo `.env`:

```
SUPABASE_URL=https://yotlwfbkxwaqviqzgtkt.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_WxJK0R1eE4pEFxgHzkUv0g_LH6cFI9s
SUPABASE_SECRET_KEY=veja o valor real no seu arquivo .env local (nunca comitar este valor)
```

⚠️ **Importante:** Adicione `.env` ao `.gitignore` para não expor suas credenciais!

## 4. Testar a Conexão

Após criar as tabelas e o bucket, abra o TaskHub:

```bash
cd "/Users/gibsonpaiva/Documents/AI STUDIO-LOCAL/taskhub"
python3 server.py
```

O sistema irá:
1. Conectar ao Supabase
2. Criar dados iniciais se necessário
3. Salvar automaticamente todas as mudanças no Supabase
4. Fazer upload de anexos para o Storage

## 5. Verificar se está Funcionando

### Checar Tabela de Estado
No SQL Editor do Supabase:
```sql
SELECT * FROM taskhub_storage;
```

### Checar Uploads
```sql
SELECT * FROM taskhub_uploads ORDER BY created_at DESC LIMIT 10;
```

### Checar Storage
Vá em **Storage** → **taskhub-uploads** e verifique os arquivos enviados.

## 6. Migração dos Dados SQLite (Opcional)

Se você já tem dados no SQLite local, pode migrar executando:

```python
# Criar script de migração: migrate_to_supabase.py
```

## Estrutura do Valor JSON (taskhub_storage)

```json
{
  "currentUser": { "id": "usr-1", "name": "...", ... },
  "users": [...],
  "tasks": [...],
  "settings": { "teamName": "...", "shift": "..." }
}
```

## Segurança

**Para produção, considere:**

1. **Autenticação:** Implementar Supabase Auth
2. **RLS mais restritivo:** 
   ```sql
   -- Exemplo: apenas usuários autenticados
   CREATE POLICY "Authenticated users only"
   ON taskhub_storage
   FOR ALL
   TO authenticated
   USING (true)
   WITH CHECK (true);
   ```
3. **CORS:** Configurar domínios permitidos no painel do Supabase
4. **Rate Limiting:** Ativar no projeto Supabase

## Troubleshooting

### Erro de CORS
- Verifique as configurações de CORS no painel do Supabase (Settings → API)
- Adicione `http://localhost:5176` aos domínios permitidos

### Erro de Permissão
- Verifique se as políticas RLS estão configuradas
- Confirme que o bucket é público

### Dados não salvam
- Abra o Console do navegador (F12) e verifique erros
- Confirme que as credenciais estão corretas no código
