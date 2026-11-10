// =============================================================================
// ESTADO DA APLICAÇÃO & PERSISTÊNCIA (SUPABASE)
// =============================================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configuração do Supabase
const SUPABASE_URL = 'https://yotlwfbkxwaqviqzgtkt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WxJK0R1eE4pEFxgHzkUv0g_LH6cFI9s';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const STATUS_BLOCKED = 'Bloqueada / Aguardando';
const FIELD_LABELS = {
  title: 'Título',
  priority: 'Prioridade',
  deadline: 'Prazo',
  description: 'Descrição',
  system: 'Sistema',
  client: 'Cliente',
  category: 'Categoria',
};

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

class DataService {
  constructor() {
    this.state = { currentUser: null, users: [], tasks: [], settings: {} };
  }

  async init() {
    // Limpar localStorage antigo na primeira execução
    if (localStorage.getItem('taskhub_backup_state')) {
      console.log('🧹 Limpando dados antigos do localStorage...');
      localStorage.removeItem('taskhub_backup_state');
    }

    try {
      // Carregar apenas do Supabase (fonte única de verdade)
      const { data, error } = await supabase
        .from('taskhub_storage')
        .select('value')
        .eq('key', 'app_state')
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = não encontrado (primeira vez)
        console.error('Erro ao carregar do Supabase:', error);
        throw error;
      }

      if (data?.value) {
        this.state = data.value;
        console.log('✅ Dados carregados do Supabase');
      } else {
        // Primeira vez: criar estrutura vazia no Supabase
        console.log('🆕 Primeira execução - criando estrutura inicial...');
        await this.createInitialData();
      }
    } catch (err) {
      console.error('❌ Falha ao conectar com Supabase:', err);
      // Não usa cache local - força Supabase como única fonte
      await this.createInitialData();
    }
    this.normalize();
    return this.state;
  }

  async createInitialData() {
    // Dados iniciais vazios (apenas estrutura)
    this.state = {
      currentUser: {
        id: "usr-1",
        name: "Gibson Paiva",
        email: "gibson.paiva@empresa.com.br",
        role: "Especialista de TI",
        avatarBg: "from-emerald-500 to-teal-600",
        initials: "GP",
      },
      users: [
        {
          id: "usr-1",
          name: "Gibson Paiva",
          email: "gibson.paiva@empresa.com.br",
          role: "Especialista de TI",
          avatarBg: "from-emerald-500 to-teal-600",
          initials: "GP",
        }
      ],
      tasks: [], // Começa vazio - sem tarefas antigas
      settings: {
        teamName: "Equipe de TI",
        shift: "Turno Diurno (07:00 às 19:00)",
      }
    };

    console.log('💾 Criando estrutura inicial vazia no Supabase...');
    await this.save();
  }

  // Limpa dados legados (férias/ausência/cobertura) vindos de versões anteriores.
  normalize() {
    const s = this.state;
    s.users = (s.users || []).map(({ status, statusLabel, ...u }) => u);
    s.tasks = s.tasks || [];
    s.tasks.forEach((t) => {
      // Garantir que campos novos existam
      if (!t.client) t.client = '';
      
      t.checklist = t.checklist || [];
      t.comments = t.comments || [];
      t.attachments = t.attachments || [];
      t.auditLog = (t.auditLog || []).map((log) =>
        log.action === 'COBERTURA_FÉRIAS' ? { ...log, action: 'REATRIBUIÇÃO' } : log
      );
    });
    s.currentUser = s.users.find((u) => u.id === s.currentUser?.id) || s.users[0] || null;
  }

  async save() {
    try {
      // Salvar APENAS no Supabase (sem cache local)
      const { error } = await supabase
        .from('taskhub_storage')
        .upsert({
          key: 'app_state',
          value: this.state,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('❌ Erro salvando no Supabase:', error);
        throw error;
      }
      
      console.log('💾 Salvo no Supabase');
    } catch (err) {
      console.error('❌ Falha crítica ao salvar no Supabase:', err);
      throw err; // Propaga o erro para o usuário saber que não salvou
    }
  }

  // ---------------------------------------------------------------------------
  // Consultas
  // ---------------------------------------------------------------------------
  getCurrentUser() {
    return this.state.users.find((u) => u.id === this.state.currentUser?.id) || this.state.users[0];
  }

  switchCurrentUser(userId) {
    const user = this.state.users.find((u) => u.id === userId);
    if (user) {
      this.state.currentUser = user;
      this.save();
    }
    return user;
  }

  getTasks() {
    return this.state.tasks;
  }

  getTaskById(taskId) {
    return this.state.tasks.find((t) => t.id === taskId);
  }

  getUserById(userId) {
    return (
      this.state.users.find((u) => u.id === userId) || {
        id: userId,
        name: 'Não atribuído',
        role: '',
        initials: '--',
        avatarBg: 'from-slate-400 to-slate-500',
      }
    );
  }

  // Registra um evento na trilha de auditoria da tarefa.
  log(task, action, description, nowIso = new Date().toISOString()) {
    task.auditLog.unshift({
      id: newId('aud'),
      action,
      description,
      actorName: this.getCurrentUser().name,
      timestamp: nowIso,
    });
    task.updatedAt = nowIso;
  }

  // ---------------------------------------------------------------------------
  // Criação / edição / exclusão
  // ---------------------------------------------------------------------------
  async createTask(data) {
    const currentUser = this.getCurrentUser();
    const nowIso = new Date().toISOString();

    const nums = this.state.tasks.map((t) => parseInt(String(t.code).replace('TASK-', ''), 10)).filter((n) => !isNaN(n));
    const code = `TASK-${nums.length ? Math.max(...nums) + 1 : 101}`;
    const assignedToId = data.assignedToId || currentUser.id;

    const task = {
      id: newId('task'),
      code,
      title: (data.title || '').trim() || 'Nova tarefa',
      description: data.description || '',
      status: 'Não Iniciada',
      blockedReason: '',
      priority: data.priority || 'Média',
      system: data.system || '',
      client: data.client || '',
      category: data.category || '',
      deadline: data.deadline || '',
      assignedToId,
      createdAt: nowIso,
      updatedAt: nowIso,
      checklist: data.checklist || [],
      comments: [],
      attachments: [],
      auditLog: [],
    };
    this.log(task, 'CRIAÇÃO', `Criada por ${currentUser.name} e atribuída a ${this.getUserById(assignedToId).name}.`, nowIso);

    this.state.tasks.unshift(task);
    await this.save();
    return task;
  }

  // Edita um campo simples (título, prioridade, prazo, descrição, responsável...).
  async updateTaskField(taskId, field, value) {
    const task = this.getTaskById(taskId);
    if (!task) return null;

    if (field === 'assignedToId') {
      if (task.assignedToId === value) return task;
      const from = this.getUserById(task.assignedToId).name;
      const to = this.getUserById(value).name;
      task.assignedToId = value;
      this.log(task, 'REATRIBUIÇÃO', `Reatribuída de ${from} para ${to}.`);
    } else {
      const clean = field === 'title' ? value.trim() || task.title : value;
      if (task[field] === clean) return task;
      const old = task[field];
      task[field] = clean;
      if (field !== 'description') {
        this.log(task, 'EDIÇÃO', `${FIELD_LABELS[field] || field} alterado de "${old || '-'}" para "${clean || '-'}".`);
      } else {
        task.updatedAt = new Date().toISOString();
      }
    }
    await this.save();
    return task;
  }

  async updateTaskStatus(taskId, newStatus, blockedReason = '') {
    const task = this.getTaskById(taskId);
    if (!task) return null;

    if (task.status === newStatus) {
      // Já bloqueada: permite apenas atualizar o motivo.
      const reason = blockedReason.trim();
      if (newStatus === STATUS_BLOCKED && reason && reason !== task.blockedReason) {
        task.blockedReason = reason;
        this.log(task, 'BLOQUEIO', `Motivo do bloqueio atualizado: ${reason}`);
        await this.save();
      }
      return task;
    }

    const oldStatus = task.status;
    const nowIso = new Date().toISOString();
    task.status = newStatus;
    task.blockedReason = newStatus === STATUS_BLOCKED ? blockedReason.trim() || 'Aguardando dependência' : '';

    if (newStatus === 'Concluída') task.completedAt = nowIso;
    else delete task.completedAt;

    if (newStatus === STATUS_BLOCKED) {
      this.log(task, 'BLOQUEIO', `Bloqueada. Motivo: ${task.blockedReason}`, nowIso);
    } else if (newStatus === 'Concluída') {
      this.log(task, 'CONCLUSÃO', `Concluída (antes: ${oldStatus}).`, nowIso);
    } else {
      this.log(task, 'STATUS', `Status alterado de '${oldStatus}' para '${newStatus}'.`, nowIso);
    }

    await this.save();
    return task;
  }

  // Assumir a tarefa para o usuário atual (1 clique).
  async takeoverTask(taskId) {
    const task = this.getTaskById(taskId);
    if (!task) return null;

    const me = this.getCurrentUser();
    if (task.assignedToId === me.id) return task;

    const from = this.getUserById(task.assignedToId).name;
    task.assignedToId = me.id;
    if (task.status === 'Não Iniciada') task.status = 'Em Andamento';
    this.log(task, 'TAKEOVER', `Assumida por ${me.name} (antes: ${from}).`);

    await this.save();
    return task;
  }

  async deleteTask(taskId) {
    const idx = this.state.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return false;
    this.state.tasks.splice(idx, 1);
    await this.save();
    return true;
  }

  // ---------------------------------------------------------------------------
  // Checklist
  // ---------------------------------------------------------------------------
  async toggleChecklistItem(taskId, checkId) {
    const task = this.getTaskById(taskId);
    const item = task?.checklist.find((c) => c.id === checkId);
    if (!item) return null;

    item.done = !item.done;
    this.log(task, 'CHECKLIST', `${item.done ? 'Concluído' : 'Desmarcado'}: "${item.text}"`);
    await this.save();
    return task;
  }

  async addChecklistItem(taskId, text) {
    const task = this.getTaskById(taskId);
    if (!task || !text.trim()) return null;

    task.checklist.push({ id: newId('chk'), text: text.trim(), done: false });
    task.updatedAt = new Date().toISOString();
    await this.save();
    return task;
  }

  async deleteChecklistItem(taskId, checkId) {
    const task = this.getTaskById(taskId);
    if (!task) return null;

    task.checklist = task.checklist.filter((c) => c.id !== checkId);
    task.updatedAt = new Date().toISOString();
    await this.save();
    return task;
  }

  // ---------------------------------------------------------------------------
  // Comentários
  // ---------------------------------------------------------------------------
  async addComment(taskId, text) {
    const task = this.getTaskById(taskId);
    if (!task || !text.trim()) return null;

    const me = this.getCurrentUser();
    const nowIso = new Date().toISOString();
    task.comments.unshift({
      id: newId('cmt'),
      authorId: me.id,
      authorName: me.name,
      text: text.trim(),
      createdAt: nowIso,
    });
    this.log(task, 'COMENTÁRIO', `Comentário de ${me.name}.`, nowIso);

    await this.save();
    return task;
  }

  // ---------------------------------------------------------------------------
  // Anexos (arquivo, print colado ou arrastado)
  // ---------------------------------------------------------------------------
  async uploadFile(dataUrl, fileName = 'print_evidencia.png') {
    try {
      // Converter data URL para Blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Gerar nome único
      const timestamp = new Date().getTime();
      const randomId = Math.random().toString(36).substring(2, 10);
      const ext = fileName.split('.').pop() || 'png';
      const storagePath = `${timestamp}_${randomId}.${ext}`;
      
      console.log('📤 Tentando upload para Supabase Storage...');
      console.log('   Bucket: taskhub-uploads');
      console.log('   Arquivo:', storagePath);
      console.log('   Tamanho:', Math.round(blob.size / 1024), 'KB');
      
      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from('taskhub-uploads')
        .upload(storagePath, blob, {
          contentType: blob.type,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Erro no upload para Supabase Storage:', error);
        console.error('   Código:', error.statusCode);
        console.error('   Mensagem:', error.message);
        
        // Fallback: usar dataUrl direto (embedded na página)
        console.warn('⚠️ Usando fallback: imagem será incorporada no JSON');
        return { success: true, url: dataUrl, fileName, fallback: true };
      }

      console.log('✅ Upload bem-sucedido!');
      
      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('taskhub-uploads')
        .getPublicUrl(storagePath);

      console.log('🔗 URL pública:', publicUrl);

      // Registrar metadados (opcional, ignora erro se a tabela não existir)
      try {
        await supabase.from('taskhub_uploads').insert({
          filename: fileName,
          storage_path: storagePath,
          size_bytes: blob.size,
          mime_type: blob.type,
          uploaded_by: this.getCurrentUser()?.name || 'Desconhecido'
        });
        console.log('📝 Metadados registrados');
      } catch (metaError) {
        console.warn('⚠️ Não foi possível registrar metadados (tabela opcional):', metaError);
      }

      return { 
        success: true, 
        url: publicUrl, 
        fileName,
        storagePath,
        fallback: false
      };
    } catch (err) {
      console.error('❌ Falha crítica no upload:', err);
      console.warn('⚠️ Usando fallback: imagem será incorporada no JSON');
      return { success: true, url: dataUrl, fileName, fallback: true };
    }
  }

  async addAttachment(taskId, { fileName, url, size }) {
    const task = this.getTaskById(taskId);
    if (!task) return null;

    const nowIso = new Date().toISOString();
    task.attachments.unshift({
      id: newId('att'),
      fileName,
      url,
      size,
      uploadedBy: this.getCurrentUser().name,
      createdAt: nowIso,
    });
    this.log(task, 'ANEXO', `Anexo adicionado: "${fileName}".`, nowIso);

    await this.save();
    return task;
  }
}

export const db = new DataService();
