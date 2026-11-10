// =============================================================================
// ESTADO DA APLICAÇÃO & PERSISTÊNCIA (SUPABASE - TABELAS NORMALIZADAS V2)
// =============================================================================

import { supabase } from './supabaseClient.js';
import { formatDeadline } from '../utils/dateUtils.js';

const AVATAR_GRADIENTS = [
  'from-emerald-500 to-teal-600',
  'from-blue-600 to-indigo-600',
  'from-purple-600 to-violet-700',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-red-600',
  'from-cyan-500 to-sky-600',
];

const STATUS_BLOCKED = 'Bloqueada / Aguardando';

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

class DataServiceV2 {
  constructor() {
    this.currentUser = null;
    this.users = [];
  }

  // Carrega os usuários e define quem está logado (o perfil é ligado pelo e-mail do login).
  async init(authUser) {
    const { data: users, error } = await supabase.from('users').select('*').order('name');
    if (error) throw new Error('Não foi possível carregar os usuários. Verifique a conexão e as permissões do Supabase.');

    this.users = users || [];
    this.currentUser = await this.resolveProfile(authUser);
    return { currentUser: this.currentUser, users: this.users };
  }

  // Acha o perfil pelo e-mail do login; se não existir, cria um novo.
  async resolveProfile(authUser) {
    const email = (authUser?.email || '').trim().toLowerCase();
    if (!email) throw new Error('A conta não tem e-mail.');

    const existing = this.users.find((u) => (u.email || '').trim().toLowerCase() === email);
    if (existing) return existing;

    const rawName = authUser.user_metadata?.name || email.split('@')[0].replace(/[._-]+/g, ' ');
    const name = rawName
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join('');
    const hash = [...email].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

    const profile = {
      id: `usr-${authUser.id.slice(0, 8)}`,
      name,
      email,
      role: 'Membro da equipe',
      initials: initials || 'TH',
      avatar_bg: AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length],
    };

    const { error } = await supabase.from('users').insert([profile]);
    if (error) {
      console.error('Erro ao criar perfil:', error);
      throw new Error('Não foi possível criar o seu perfil de usuário.');
    }

    this.users = [...this.users, profile].sort((x, y) => x.name.localeCompare(y.name));
    return profile;
  }

  // ---------------------------------------------------------------------------
  // Consultas
  // ---------------------------------------------------------------------------
  getCurrentUser() {
    return this.currentUser;
  }

  getUserById(userId) {
    return this.users.find(u => u.id === userId) || {
      id: userId,
      name: 'Não atribuído',
      role: '',
      initials: '--',
      avatar_bg: 'from-slate-400 to-slate-500',
    };
  }

  async getTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        checklist:checklist_items(*),
        comments(*),
        attachments(*),
        audit:audit_log(*)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar tarefas:', error);
      return [];
    }

    // Transformar para formato compatível com o frontend
    return (data || []).map(t => ({
      ...t,
      assignedToId: t.assigned_to_id,
      createdById: t.created_by_id,
      ticketNumber: t.ticket_number,
      blockedReason: t.blocked_reason,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      completedAt: t.completed_at,
      checklist: t.checklist || [],
      comments: t.comments || [],
      attachments: t.attachments.map(a => ({
        ...a,
        fileName: a.file_name,
        uploadedBy: a.uploaded_by,
        createdAt: a.created_at
      })),
      auditLog: (t.audit || []).map(a => ({
        ...a,
        actorName: a.actor_name,
        timestamp: a.created_at
      }))
    }));
  }

  async getTaskById(taskId) {
    const tasks = await this.getTasks();
    return tasks.find(t => t.id === taskId);
  }

  // Registra um evento na trilha de auditoria
  async log(taskId, action, description, metadata = null) {
    const currentUser = this.getCurrentUser();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('audit_log')
      .insert({
        id: newId('aud'),
        task_id: taskId,
        action,
        description,
        actor_id: currentUser?.id,
        actor_name: currentUser?.name || 'Sistema',
        metadata,
        created_at: now
      });

    if (error) console.error('Erro ao registrar log:', error);

    // Atualizar updated_at da tarefa
    await supabase
      .from('tasks')
      .update({ updated_at: now })
      .eq('id', taskId);
  }

  // ---------------------------------------------------------------------------
  // Criação / edição / exclusão
  // ---------------------------------------------------------------------------
  async createTask(data) {
    const currentUser = this.getCurrentUser();
    const nowIso = new Date().toISOString();

    // Gerar próximo código
    const { data: tasks } = await supabase
      .from('tasks')
      .select('code')
      .order('code', { ascending: false })
      .limit(1);

    const lastCode = tasks?.[0]?.code || 'TASK-100';
    const num = parseInt(lastCode.replace('TASK-', ''), 10);
    const code = `TASK-${num + 1}`;

    const assignedToId = data.assignedToId || currentUser.id;

    const taskData = {
      id: newId('task'),
      code,
      title: (data.title || '').trim() || 'Nova tarefa',
      description: data.description || '',
      status: 'Não Iniciada',
      blocked_reason: '',
      priority: data.priority || 'Média',
      system: data.system || '',
      client: data.client || '',
      ticket_number: data.ticketNumber || '',
      category: data.category || '',
      deadline: data.deadline || '',
      assigned_to_id: assignedToId,
      created_by_id: currentUser.id,
      created_at: nowIso,
      updated_at: nowIso
    };

    const { data: task, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar tarefa:', error);
      throw error;
    }

    // Criar checklist se houver
    if (data.checklist && data.checklist.length > 0) {
      const checklistData = data.checklist.map((item, i) => ({
        id: item.id || newId('chk'),
        task_id: task.id,
        text: item.text,
        done: item.done || false,
        position: i
      }));

      await supabase.from('checklist_items').insert(checklistData);
    }

    // Registrar no histórico
    await this.log(
      task.id,
      'CRIAÇÃO',
      `Criada por ${currentUser.name} e atribuída a ${this.getUserById(assignedToId).name}.`
    );

    return {
      ...task,
      assignedToId: task.assigned_to_id,
      createdById: task.created_by_id,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    };
  }

  async updateTaskField(taskId, field, value) {
    const task = await this.getTaskById(taskId);
    if (!task) return null;

    const fieldMap = {
      title: 'title',
      priority: 'priority',
      deadline: 'deadline',
      description: 'description',
      system: 'system',
      client: 'client',
      ticketNumber: 'ticket_number',
      category: 'category',
      assignedToId: 'assigned_to_id'
    };

    const dbField = fieldMap[field] || field;
    const clean = field === 'title' ? value.trim() || task.title : value;

    if (task[field] === clean) return task;

    // Atualizar no banco
    const { error } = await supabase
      .from('tasks')
      .update({ [dbField]: clean, updated_at: new Date().toISOString() })
      .eq('id', taskId);

    if (error) {
      console.error('Erro ao atualizar campo:', error);
      return null;
    }

    // Registrar no histórico
    if (field === 'assignedToId') {
      const from = this.getUserById(task.assignedToId).name;
      const to = this.getUserById(value).name;
      await this.log(taskId, 'REATRIBUIÇÃO', `Reatribuída de ${from} para ${to}.`);
    } else if (field !== 'description') {
      const labels = {
        title: 'Título',
        priority: 'Prioridade',
        deadline: 'Prazo',
        system: 'Sistema',
        client: 'Cliente',
        ticketNumber: 'Número do chamado',
        category: 'Categoria'
      };
      const show = (v) => (field === 'deadline' ? formatDeadline(v) : v) || '-';
      await this.log(
        taskId,
        'EDIÇÃO',
        `${labels[field] || field} alterado de "${show(task[field])}" para "${show(clean)}".`
      );
    }

    return await this.getTaskById(taskId);
  }

  async updateTaskStatus(taskId, newStatus, blockedReason = '') {
    const task = await this.getTaskById(taskId);
    if (!task) return null;

    const nowIso = new Date().toISOString();
    const updateData = {
      status: newStatus,
      blocked_reason: newStatus === STATUS_BLOCKED ? blockedReason.trim() || 'Aguardando dependência' : '',
      updated_at: nowIso
    };

    if (newStatus === 'Concluída') {
      updateData.completed_at = nowIso;
    }

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);

    if (error) {
      console.error('Erro ao atualizar status:', error);
      return null;
    }

    // Registrar no histórico
    if (newStatus === STATUS_BLOCKED) {
      await this.log(taskId, 'BLOQUEIO', `Bloqueada. Motivo: ${updateData.blocked_reason}`);
    } else if (newStatus === 'Concluída') {
      await this.log(taskId, 'CONCLUSÃO', `Concluída (antes: ${task.status}).`);
    } else {
      await this.log(taskId, 'STATUS', `Status alterado de '${task.status}' para '${newStatus}'.`);
    }

    return await this.getTaskById(taskId);
  }

  async takeoverTask(taskId) {
    const task = await this.getTaskById(taskId);
    if (!task) return null;

    const me = this.getCurrentUser();
    if (task.assignedToId === me.id) return task;

    const from = this.getUserById(task.assignedToId).name;
    const newStatus = task.status === 'Não Iniciada' ? 'Em Andamento' : task.status;

    await supabase
      .from('tasks')
      .update({
        assigned_to_id: me.id,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    await this.log(taskId, 'TAKEOVER', `Assumida por ${me.name} (antes: ${from}).`);

    return await this.getTaskById(taskId);
  }

  async deleteTask(taskId) {
    // Soft delete
    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', taskId);

    if (error) {
      console.error('Erro ao deletar tarefa:', error);
      return false;
    }

    await this.log(taskId, 'EXCLUSÃO', 'Tarefa excluída.');
    return true;
  }

  // ---------------------------------------------------------------------------
  // Checklist
  // ---------------------------------------------------------------------------
  async toggleChecklistItem(taskId, checkId) {
    const { data: item } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('id', checkId)
      .single();

    if (!item) return null;

    await supabase
      .from('checklist_items')
      .update({ done: !item.done, updated_at: new Date().toISOString() })
      .eq('id', checkId);

    await this.log(
      taskId,
      'CHECKLIST',
      `${!item.done ? 'Concluído' : 'Desmarcado'}: "${item.text}"`
    );

    return await this.getTaskById(taskId);
  }

  async addChecklistItem(taskId, text) {
    if (!text.trim()) return null;

    const { error } = await supabase
      .from('checklist_items')
      .insert({
        id: newId('chk'),
        task_id: taskId,
        text: text.trim(),
        done: false
      });

    if (error) {
      console.error('Erro ao adicionar item da checklist:', error);
      return null;
    }

    return await this.getTaskById(taskId);
  }

  async deleteChecklistItem(taskId, checkId) {
    await supabase
      .from('checklist_items')
      .delete()
      .eq('id', checkId);

    return await this.getTaskById(taskId);
  }

  // ---------------------------------------------------------------------------
  // Comentários
  // ---------------------------------------------------------------------------
  async addComment(taskId, text) {
    if (!text.trim()) return null;

    const me = this.getCurrentUser();
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('comments')
      .insert({
        id: newId('cmt'),
        task_id: taskId,
        author_id: me.id,
        author_name: me.name,
        text: text.trim(),
        created_at: nowIso
      });

    if (error) {
      console.error('Erro ao adicionar comentário:', error);
      return null;
    }

    await this.log(taskId, 'COMENTÁRIO', `Comentário de ${me.name}.`);

    return await this.getTaskById(taskId);
  }

  // ---------------------------------------------------------------------------
  // Anexos
  // ---------------------------------------------------------------------------
  async uploadFile(dataUrl, fileName = 'print_evidencia.png') {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      const timestamp = new Date().getTime();
      const randomId = Math.random().toString(36).substring(2, 10);
      const ext = fileName.split('.').pop() || 'png';
      const storagePath = `${timestamp}_${randomId}.${ext}`;
      
      console.log('📤 Upload para Supabase Storage...');
      
      const { data, error } = await supabase.storage
        .from('taskhub-uploads')
        .upload(storagePath, blob, {
          contentType: blob.type,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Erro no upload:', error);
        return { success: true, url: dataUrl, fileName, fallback: true };
      }

      const { data: { publicUrl } } = supabase.storage
        .from('taskhub-uploads')
        .getPublicUrl(storagePath);

      console.log('✅ Upload bem-sucedido:', publicUrl);

      return { 
        success: true, 
        url: publicUrl, 
        fileName,
        storagePath,
        mimeType: blob.type,
        size: `${Math.round(blob.size / 1024)} KB`,
        fallback: false
      };
    } catch (err) {
      console.error('❌ Falha no upload:', err);
      return { success: true, url: dataUrl, fileName, fallback: true };
    }
  }

  async addAttachment(taskId, { fileName, url, size, storagePath, mimeType }) {
    const me = this.getCurrentUser();
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('attachments')
      .insert({
        id: newId('att'),
        task_id: taskId,
        file_name: fileName,
        url: url,
        size: size,
        mime_type: mimeType,
        storage_path: storagePath,
        uploaded_by: me.name,
        uploaded_by_id: me.id,
        created_at: nowIso
      });

    if (error) {
      console.error('Erro ao adicionar anexo:', error);
      return null;
    }

    await this.log(taskId, 'ANEXO', `Anexo adicionado: "${fileName}".`);

    return await this.getTaskById(taskId);
  }

  // Extrai o caminho do arquivo no bucket a partir da URL pública (anexos antigos não têm storage_path).
  storagePathFromUrl(url) {
    const m = (url || '').match(/\/storage\/v1\/object\/(?:public|sign)\/taskhub-uploads\/([^?]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  // Exclui o anexo: primeiro o arquivo no bucket, depois o registro. Se o bucket falhar, nada é apagado.
  async deleteAttachment(taskId, attachmentId) {
    const { data: att, error: findError } = await supabase
      .from('attachments')
      .select('*')
      .eq('id', attachmentId)
      .single();

    if (findError || !att) {
      console.error('Erro ao localizar anexo:', findError);
      return { success: false, error: 'Anexo não encontrado.' };
    }

    const path = att.storage_path || this.storagePathFromUrl(att.url);

    if (path) {
      const { data: removed, error: removeError } = await supabase.storage
        .from('taskhub-uploads')
        .remove([path]);

      if (removeError) {
        console.error('Erro ao apagar do bucket:', removeError);
        return { success: false, error: 'Não consegui apagar o arquivo do bucket.' };
      }

      // O Storage devolve lista vazia, sem erro, quando não achou o arquivo OU quando a política bloqueou.
      // Confere se o arquivo ainda existe para não deixar lixo no bucket.
      if (!removed || removed.length === 0) {
        const slash = path.lastIndexOf('/');
        const folder = slash >= 0 ? path.slice(0, slash) : '';
        const name = slash >= 0 ? path.slice(slash + 1) : path;
        const { data: found } = await supabase.storage
          .from('taskhub-uploads')
          .list(folder, { search: name });

        if ((found || []).some((f) => f.name === name)) {
          console.error('Arquivo continua no bucket após remove(): falta política de DELETE em storage.objects?');
          return {
            success: false,
            error: 'O bucket não permitiu apagar o arquivo (verifique a política de DELETE em storage.objects).',
          };
        }
      }
    }

    const { error: deleteError } = await supabase.from('attachments').delete().eq('id', attachmentId);
    if (deleteError) {
      console.error('Erro ao apagar registro do anexo:', deleteError);
      return { success: false, error: 'Arquivo apagado do bucket, mas falhou ao remover o registro.' };
    }

    await this.log(taskId, 'ANEXO', `Anexo removido: "${att.file_name}".`);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Queries avançadas para relatórios
  // ---------------------------------------------------------------------------
  async getTasksByClient(client) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('client', client)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    return data || [];
  }

  async getTaskStats() {
    const { data } = await supabase
      .from('tasks')
      .select('status, priority, client')
      .is('deleted_at', null);

    if (!data) return {};

    return {
      total: data.length,
      byStatus: data.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {}),
      byPriority: data.reduce((acc, t) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1;
        return acc;
      }, {}),
      byClient: data.reduce((acc, t) => {
        if (t.client) acc[t.client] = (acc[t.client] || 0) + 1;
        return acc;
      }, {})
    };
  }

  async getAuditHistory(filters = {}) {
    let query = supabase
      .from('audit_log')
      .select(`
        *,
        task:tasks(code, title, client)
      `)
      .order('created_at', { ascending: false });

    if (filters.taskId) {
      query = query.eq('task_id', filters.taskId);
    }
    if (filters.actorId && filters.actorId !== 'ALL') {
      query = query.eq('actor_id', filters.actorId);
    }
    if (filters.action && filters.action !== 'ALL') {
      query = query.eq('action', filters.action);
    }
    if (filters.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.gte('created_at', startOfDay.toISOString())
                   .lte('created_at', endOfDay.toISOString());
    }

    const { data, error } = await query.limit(500);

    if (error) {
      console.error('❌ Erro ao carregar histórico:', error);
      return [];
    }

    console.log('📋 Audit history carregado:', data?.length || 0, 'registros');
    if (data && data.length > 0) {
      console.log('📋 Primeiro registro:', data[0]);
    }

    return data || [];
  }
}

export const db = new DataServiceV2();
