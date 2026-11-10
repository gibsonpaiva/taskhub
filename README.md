# TaskHub

Gestão de tarefas da equipe com Supabase: um quadro, poucos cliques, histórico completo de tudo que acontece na nuvem.

![TaskHub](https://img.shields.io/badge/status-ativo-success)
![Supabase](https://img.shields.io/badge/database-Supabase-green)
![Deploy](https://img.shields.io/badge/deploy-Vercel-black)

## ✨ Funcionalidades

- **Quadro Kanban:** Visualização clara das tarefas em colunas de status
- **Drag & Drop:** Arraste tarefas entre colunas para mudar o status
- **Checklist:** Adicione itens de checklist em cada tarefa
- **Comentários:** Comunique-se com a equipe em tempo real
- **Anexos:** Cole prints (Ctrl+V) ou arraste arquivos para anexar
- **Histórico completo:** Auditoria de todas as ações (quem fez o quê e quando)
- **Filtros:** Busque por texto, responsável ou prioridade
- **Modo lista/quadro:** Alterne entre visualizações
- **Atalhos de teclado:** Produtividade máxima

## 🚀 Como usar

### **Criar tarefa:**
Digite o título no topo e aperte Enter, ou use "Mais opções" para o formulário completo.

### **Avançar tarefa:**
Cada card tem um botão que muda conforme a situação: *Iniciar*, *Concluir*, *Retomar*, *Reabrir* ou *Assumir*.

### **Editar:**
Clique no card. Todos os campos são editáveis e salvam automaticamente.

### **Anexos:**
- Cole um print: `⌘V` / `Ctrl+V`
- Arraste um arquivo para a área de anexos
- Clique para selecionar arquivo

### **Comentários:**
Digite e aperte `⌘/Ctrl + Enter` para enviar.

### **Histórico:**
Aba própria, filtrável por colaborador, data, tipo de ação e texto livre.

## ⌨️ Atalhos

| Tecla | Ação |
|-------|------|
| `n` | Focar no campo de nova tarefa |
| `/` | Focar na busca |
| `Esc` | Fechar modal |
| `⌘/Ctrl + Enter` | Enviar comentário |

---

## 🛠️ Configuração Local

### **Pré-requisitos:**
- Python 3.7+
- Conta no [Supabase](https://supabase.com) (grátis)

### **1. Clone o repositório:**
```bash
git clone https://github.com/seu-usuario/taskhub.git
cd taskhub
```

### **2. Configure o Supabase:**

1. Crie um projeto no [Supabase](https://app.supabase.com)
2. Execute os scripts SQL do arquivo `SUPABASE_SETUP.md`
3. Crie o bucket `taskhub-uploads` (público)

### **3. Configure as variáveis de ambiente:**

```bash
cp .env.example .env
```

Edite o `.env` e adicione suas credenciais do Supabase.

### **4. Inicie o servidor:**
```bash
python3 server.py
```

Abre em `http://localhost:5176`

---

## 🌐 Deploy na Vercel

### **Opção 1: Via GitHub (recomendado)**

1. Suba o projeto para o GitHub (sem o `.env`!)
2. Acesse [vercel.com](https://vercel.com) e conecte com GitHub
3. Importe o repositório `taskhub`
4. Clique em **Deploy**
5. Pronto! ✨

**Não precisa configurar variáveis de ambiente na Vercel** porque as credenciais estão direto no código JavaScript (chave pública).

### **Opção 2: Via Vercel CLI**

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
cd taskhub
vercel

# Primeira vez: responda as perguntas
# Depois: apenas 'vercel' para atualizar
```

---

## 📁 Estrutura do Projeto

```
taskhub/
├── index.html                    # Página principal
├── style.css                     # Estilos e animações
├── server.py                     # Servidor Python (dev local)
├── vercel.json                   # Configuração Vercel (prod)
├── .env                          # Credenciais (NÃO COMMITAR)
├── .env.example                  # Template de credenciais
├── .gitignore                    # Arquivos ignorados pelo Git
├── SUPABASE_SETUP.md            # Instruções de setup do banco
└── src/
    ├── main.js                   # App principal
    ├── services/
    │   └── dataService.js        # Integração Supabase
    ├── components/               # Componentes UI
    │   ├── Header.js
    │   ├── KanbanView.js
    │   ├── TaskDetailModal.js
    │   ├── NewTaskModal.js
    │   └── AuditTimelineView.js
    └── utils/                    # Utilitários
        └── markdown.js
```

---

## 🔒 Segurança

### **Arquivos sensíveis:**
- ✅ `.env` está no `.gitignore`
- ✅ Nunca commite credenciais
- ✅ Use chave **pública** (PUBLISHABLE_KEY) no frontend
- ✅ Row Level Security (RLS) configurado no Supabase

### **Para produção:**
1. Configure RLS mais restritivo no Supabase
2. Adicione autenticação de usuários (Supabase Auth)
3. Use HTTPS (Vercel já faz isso automaticamente)

---

## 🧪 Tecnologias

- **Frontend:** Vanilla JavaScript (ES6 Modules)
- **CSS:** Tailwind CSS (via CDN)
- **Ícones:** Lucide Icons
- **Backend:** Supabase (PostgreSQL + Storage)
- **Deploy:** Vercel
- **Dev Server:** Python 3

---

## 📝 Como Contribuir

1. Fork o projeto
2. Crie uma branch: `git checkout -b minha-feature`
3. Commit suas mudanças: `git commit -m 'feat: Minha nova feature'`
4. Push para a branch: `git push origin minha-feature`
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é de código aberto sob a licença MIT.

---

## 🆘 Suporte

Encontrou um bug ou tem uma sugestão? [Abra uma issue](https://github.com/seu-usuario/taskhub/issues)!

---

## 👤 Autor

**Gibson Paiva**
- GitHub: [@gibsonpaiva](https://github.com/gibsonpaiva)

---

**Desenvolvido com ❤️ e ☕**
