# 🚀 Guia de Deploy - TaskHub

## 📋 Checklist Antes de Publicar

### ✅ Preparação:
- [x] Credenciais no `.env` (não no código)
- [x] `.gitignore` configurado
- [x] `.env.example` criado
- [x] `vercel.json` configurado
- [x] README.md atualizado
- [x] Supabase configurado (tabelas + bucket + políticas)

---

## 🐙 Passo 1: Subir para o GitHub

### **1.1 Inicializar Git (se ainda não iniciou):**

```bash
cd "/Users/gibsonpaiva/Documents/AI STUDIO-LOCAL/taskhub"

# Inicializar repositório
git init

# Adicionar todos os arquivos (exceto os do .gitignore)
git add .

# Primeiro commit
git commit -m "feat: TaskHub inicial com Supabase"
```

### **1.2 Criar repositório no GitHub:**

1. Acesse [github.com/new](https://github.com/new)
2. Nome do repositório: `taskhub`
3. Descrição: `Sistema de gestão de tarefas com Kanban, histórico completo e integração Supabase`
4. Deixe como **público** (ou privado, sua escolha)
5. **NÃO** marque "Add README" (já temos um)
6. Clique em **"Create repository"**

### **1.3 Conectar e fazer push:**

```bash
# Adicionar o remote (substitua SEU-USUARIO pelo seu usuário GitHub)
git remote add origin https://github.com/SEU-USUARIO/taskhub.git

# Renomear branch para main
git branch -M main

# Fazer o primeiro push
git push -u origin main
```

### **1.4 Verificar no GitHub:**

Acesse: `https://github.com/SEU-USUARIO/taskhub`

Deve aparecer todos os arquivos, **EXCETO** o `.env` (que está no .gitignore).

---

## ▲ Passo 2: Deploy na Vercel

### **Opção A: Via Interface Web (Mais Fácil)**

1. **Acesse:** [vercel.com](https://vercel.com)
2. **Login:** Use sua conta GitHub
3. **Novo Projeto:**
   - Clique em **"Add New..."** → **"Project"**
   - Selecione o repositório `taskhub`
   - Clique em **"Import"**

4. **Configurações:**
   - **Framework Preset:** `Other`
   - **Root Directory:** `./` (deixar padrão)
   - **Build Command:** deixe vazio
   - **Output Directory:** `./` (deixar padrão)

5. **Environment Variables:**
   - ❌ **NÃO precisa adicionar!** As credenciais estão no código JS (chave pública)

6. **Deploy:**
   - Clique em **"Deploy"**
   - Aguarde 1-2 minutos ⏳
   - Pronto! 🎉

7. **URL do seu site:**
   ```
   https://taskhub-XXXXXXX.vercel.app
   ```

---

### **Opção B: Via Vercel CLI**

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
cd "/Users/gibsonpaiva/Documents/AI STUDIO-LOCAL/taskhub"
vercel

# Responda as perguntas:
# - Set up and deploy? Y
# - Which scope? [sua conta]
# - Link to existing project? N
# - What's your project's name? taskhub
# - In which directory? ./
# - Override settings? N

# 4. Aguarde o deploy
# URL será exibida no final!

# 5. Deploy em produção (opcional)
vercel --prod
```

---

## 🔧 Configurações Adicionais na Vercel (Opcional)

### **Domínio Customizado:**

1. Na Vercel, vá em **Settings** → **Domains**
2. Adicione seu domínio (ex: `taskhub.seusite.com`)
3. Configure o DNS conforme instruções

### **Configurar CORS (se necessário):**

Já está configurado no `vercel.json`, mas se precisar ajustar:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ]
}
```

---

## 🔄 Atualizações Futuras

### **Fazer mudanças e atualizar:**

```bash
# 1. Fazer mudanças no código

# 2. Commitar
git add .
git commit -m "feat: nova funcionalidade X"

# 3. Enviar para GitHub
git push

# 4. A Vercel faz deploy automático! 🎉
# Aguarde 1-2 minutos e recarregue seu site
```

---

## 🛡️ Segurança do Supabase

### **Permitir domínio da Vercel:**

1. No Supabase, vá em **Settings** → **API**
2. Em **CORS Configuration**, adicione:
   ```
   https://taskhub-XXXXXXX.vercel.app
   ```
3. Salve

### **Verificar políticas RLS:**

Execute no SQL Editor do Supabase:

```sql
-- Ver políticas ativas
SELECT * FROM pg_policies WHERE tablename IN ('objects');

-- Ver configuração do bucket
SELECT * FROM storage.buckets WHERE id = 'taskhub-uploads';
```

---

## ✅ Verificar se está Funcionando

### **1. Acesse seu site na Vercel**
### **2. Abra o Console (F12)**
### **3. Deve aparecer:**
```
✅ Supabase client inicializado
✅ Dados carregados do Supabase
```

### **4. Teste:**
- Criar uma tarefa
- Adicionar um anexo
- Recarregar a página (dados devem persistir)

---

## 🆘 Problemas Comuns

### **Erro: "Bucket not found"**
→ Verifique se o bucket `taskhub-uploads` está criado e público no Supabase

### **Erro de CORS**
→ Adicione o domínio da Vercel nas configurações de CORS do Supabase

### **Dados não salvam**
→ Verifique as políticas RLS no Supabase (devem permitir acesso público)

### **404 ao acessar rotas**
→ Verifique o `vercel.json` (já está configurado)

---

## 📊 Monitoramento

### **Vercel Analytics (opcional):**

1. Na Vercel, vá em **Analytics**
2. Ative o monitoramento
3. Veja visitas, performance, etc.

### **Supabase Logs:**

1. No Supabase, vá em **Database** → **Logs**
2. Monitore queries e erros

---

## 🎯 Próximos Passos (Futuro)

- [ ] Adicionar autenticação de usuários (Supabase Auth)
- [ ] Configurar RLS por usuário
- [ ] Adicionar notificações em tempo real
- [ ] PWA (Progressive Web App)
- [ ] Dark mode
- [ ] Internacionalização (i18n)

---

## 📞 Suporte

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **GitHub Issues:** https://github.com/SEU-USUARIO/taskhub/issues

---

**Bom deploy! 🚀**
