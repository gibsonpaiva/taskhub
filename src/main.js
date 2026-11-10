// =============================================================================
// TASKHUB — CONTROLADOR PRINCIPAL
// =============================================================================

import { db } from './services/dataServiceV2.js';
import { renderHeader } from './components/Header.js';
import { renderKanbanView, renderBoardContent } from './components/KanbanView.js';
import { renderAuditTimelineView, renderAuditList } from './components/AuditTimelineView.js';
import { renderTaskDetailModal } from './components/TaskDetailModal.js';
import { renderNewTaskModal } from './components/NewTaskModal.js';
import { openLightboxFromLink } from './components/Lightbox.js';
import { mountLogin } from './components/LoginView.js';
import { getSessionUser, isRecoveryFlow, signOut } from './services/auth.js';
import { isPushSupported, registerServiceWorker, getExistingSubscription, enablePushNotifications, disablePushNotifications } from './services/pushNotifications.js';
import { escapeHtml } from './utils/markdown.js';

const BLOCKED = 'Bloqueada / Aguardando';
const EMPTY_FILTERS = { search: '', quick: 'all', analyst: 'ALL' };

const uiState = {
  currentTab: 'kanban', // 'kanban' | 'audit'
  kanbanFilters: { ...EMPTY_FILTERS },
  kanbanViewMode: localStorage.getItem('taskhub_view_mode') || 'kanban', // 'kanban' | 'table'
  auditFilters: { userId: 'ALL', date: '', action: 'ALL', search: '' },
  activeModal: null, // null | 'task-detail' | 'new-task'
  selectedTaskId: null,
  toast: null,
  pushEnabled: false,
};

let draggingTaskId = null;

// =============================================================================
// UTILITÁRIOS DE UI
// =============================================================================
const refreshIcons = () => window.lucide?.createIcons();

function showToast(message, type = 'success') {
  uiState.toast = { message, type };
  renderToast();
  setTimeout(() => {
    if (uiState.toast?.message === message) {
      uiState.toast = null;
      renderToast();
    }
  }, 3000);
}

function renderToast() {
  let el = document.getElementById('toast-container');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-container';
    el.className = 'fixed bottom-5 right-5 z-[90] no-print';
    document.body.appendChild(el);
  }
  if (!uiState.toast) {
    el.innerHTML = '';
    return;
  }
  const isErr = uiState.toast.type === 'error';
  el.innerHTML = `
    <div class="toast flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-floating text-xs font-bold text-white ${isErr ? 'bg-[#E52521]' : 'bg-slate-900'}">
      <span class="w-1.5 h-1.5 rounded-full ${isErr ? 'bg-white' : 'bg-emerald-400'}"></span>
      <span>${escapeHtml(uiState.toast.message)}</span>
    </div>`;
}

// =============================================================================
// RENDERIZAÇÃO
// =============================================================================
function getModalHtml() {
  const currentUser = db.getCurrentUser();
  if (uiState.activeModal === 'task-detail' && uiState.selectedTaskId) {
    // Será carregado async no renderModalOnly
    return '<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40"><p class="text-white">Carregando...</p></div>';
  }
  if (uiState.activeModal === 'new-task') {
    return renderNewTaskModal({ users: db.users, currentUser });
  }
  return '';
}

function renderModalOnly() {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return renderApp();

  const currentUser = db.getCurrentUser();

  // Para tarefas, carregar do banco
  if (uiState.activeModal === 'task-detail' && uiState.selectedTaskId) {
    db.getTaskById(uiState.selectedTaskId).then(task => {
      if (!task) {
        closeModal();
        return;
      }
      
      const prevScroll = document.getElementById('modal-scroll')?.scrollTop ?? 0;
      const wasOpen = !!modalRoot.querySelector('.modal-backdrop:not(.closing)');

      modalRoot.innerHTML = renderTaskDetailModal({ task, users: db.users, currentUser });

      if (wasOpen) {
        modalRoot.querySelector('.modal-backdrop')?.classList.add('no-anim');
        const scroller = document.getElementById('modal-scroll');
        if (scroller) scroller.scrollTop = prevScroll;
      }

      refreshIcons();
      setupModalListeners();
    });
  } else if (uiState.activeModal === 'new-task') {
    const prevScroll = document.getElementById('modal-scroll')?.scrollTop ?? 0;
    const wasOpen = !!modalRoot.querySelector('.modal-backdrop:not(.closing)');

    modalRoot.innerHTML = renderNewTaskModal({ users: db.users, currentUser });

    if (wasOpen) {
      modalRoot.querySelector('.modal-backdrop')?.classList.add('no-anim');
      const scroller = document.getElementById('modal-scroll');
      if (scroller) scroller.scrollTop = prevScroll;
    }

    refreshIcons();
    setupModalListeners();
  } else {
    modalRoot.innerHTML = '';
  }
}

function closeModal() {
  const finish = () => {
    uiState.activeModal = null;
    uiState.selectedTaskId = null;
    renderModalOnly();
  };
  const backdrop = document.querySelector('#modal-root .modal-backdrop');
  if (backdrop) {
    backdrop.classList.add('closing');
    setTimeout(finish, 150);
  } else {
    finish();
  }
}

function openModal(name, taskId = null) {
  uiState.activeModal = name;
  uiState.selectedTaskId = taskId;
  renderModalOnly();
}

function renderApp({ skipModal = false } = {}) {
  const root = document.getElementById('app');
  if (!root) return;

  const currentUser = db.getCurrentUser();
  if (!currentUser) {
    root.innerHTML = `<p class="p-10 text-sm text-slate-500">Carregando usuários...</p>`;
    return;
  }

  // Carregar tarefas do banco (async)
  db.getTasks().then(async tasks => {
    const state = { 
      currentUser, 
      users: db.users, 
      tasks,
      settings: {} 
    };

    // Se estiver na aba audit, carregar também o histórico
    if (uiState.currentTab === 'audit') {
      const auditData = await db.getAuditHistory(uiState.auditFilters);
      state.auditLog = auditData;
    }

    if (!document.getElementById('main-view-content')) {
      root.innerHTML = `
        <div id="header-root"></div>
        <main id="main-view-content" class="max-w-[1600px] mx-auto w-full px-4 sm:px-6 py-5"></main>
        <div id="modal-root"></div>`;
    }

    document.getElementById('header-root').innerHTML = renderHeader({ currentTab: uiState.currentTab, state, currentUser, pushEnabled: uiState.pushEnabled });

    document.getElementById('main-view-content').innerHTML =
      uiState.currentTab === 'audit'
        ? renderAuditTimelineView({ state, filters: uiState.auditFilters })
        : renderKanbanView({ state, currentUser, filters: uiState.kanbanFilters, viewMode: uiState.kanbanViewMode });

    if (skipModal) refreshIcons();
    else renderModalOnly();
    refreshIcons(); // sempre redesenha os ícones (antes faltavam quando não havia modal aberto)
    renderToast();
  });
}

// Atualiza apenas a lista (quadro/histórico), mantendo o foco do campo de busca.
async function renderListOnly() {
  const currentUser = db.getCurrentUser();
  
  if (uiState.currentTab === 'audit') {
    const auditData = await db.getAuditHistory(uiState.auditFilters);
    const tasks = await db.getTasks();
    const state = { users: db.users, tasks, auditLog: auditData };
    const el = document.getElementById('audit-list');
    if (el) el.innerHTML = renderAuditList({ state, filters: uiState.auditFilters });
    refreshIcons();
  } else {
    const tasks = await db.getTasks();
    const state = { currentUser, users: db.users, tasks };
    const el = document.getElementById('board-content');
    if (el) {
      el.innerHTML = renderBoardContent({ state, currentUser, filters: uiState.kanbanFilters, viewMode: uiState.kanbanViewMode });
    }
    refreshIcons();
  }
}

// =============================================================================
// ANEXOS (arquivo, arrastar ou colar print)
// =============================================================================
async function processAndUploadFile(file, taskId) {
  showToast('Enviando anexo...');
  const dataUrl = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

  const res = await db.uploadFile(dataUrl, file.name);
  if (!res.success) return showToast('Erro ao anexar arquivo', 'error');

  await db.addAttachment(taskId, {
    fileName: file.name,
    url: res.url,
    size: `${Math.round(file.size / 1024)} KB`,
    storagePath: res.storagePath,
    mimeType: res.mimeType,
  });
  showToast(`"${file.name}" anexado`);
  if (uiState.selectedTaskId === taskId) renderModalOnly();
}

function setupModalListeners() {
  const dropzone = document.getElementById('dropzone-attachments');
  const fileInput = document.getElementById('file-input-modal');
  if (!dropzone || !fileInput) return;

  dropzone.onclick = () => fileInput.click();
  fileInput.onchange = (e) => {
    const file = e.target.files?.[0];
    if (file && uiState.selectedTaskId) processAndUploadFile(file, uiState.selectedTaskId);
  };
  dropzone.ondragover = (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  };
  dropzone.ondragleave = () => dropzone.classList.remove('drag-over');
  dropzone.ondrop = (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const file = e.dataTransfer.files?.[0];
    if (file && uiState.selectedTaskId) processAndUploadFile(file, uiState.selectedTaskId);
  };
}

// Colar print (Ctrl+V / Cmd+V) com o modal da tarefa aberto
window.addEventListener('paste', (e) => {
  if (uiState.activeModal !== 'task-detail' || !uiState.selectedTaskId) return;
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image'));
  const file = item?.getAsFile();
  if (!file) return;
  e.preventDefault();
  const renamed = new File([file], `print_tela_${Date.now()}.png`, { type: file.type });
  processAndUploadFile(renamed, uiState.selectedTaskId);
});

// =============================================================================
// AÇÕES
// =============================================================================
async function changeStatus(taskId, status, reason = '') {
  const task = await db.updateTaskStatus(taskId, status, reason);
  if (task) showToast(`${task.code}: ${status}`);
  renderApp();
}

const actions = {
  'go-tab'(el) {
    uiState.currentTab = el.dataset.tab;
    renderApp();
  },

  'set-quick-filter'(el) {
    uiState.kanbanFilters.quick = el.dataset.filter;
    renderApp({ skipModal: true });
  },

  'set-view-mode'(el) {
    uiState.kanbanViewMode = el.dataset.mode;
    localStorage.setItem('taskhub_view_mode', el.dataset.mode);
    renderApp({ skipModal: true });
  },

  'open-new-task-modal'() {
    openModal('new-task');
    document.getElementById('new-task-title')?.focus();
  },

  'open-task-detail'(el) {
    if (el.dataset.taskId) openModal('task-detail', el.dataset.taskId);
  },

  'close-modal': closeModal,

  logout,

  async 'toggle-push'() {
    if (!isPushSupported()) {
      showToast('Este navegador não suporta notificações push.', 'error');
      return;
    }
    if (uiState.pushEnabled) {
      await disablePushNotifications();
      uiState.pushEnabled = false;
      showToast('Notificações desativadas');
    } else {
      const result = await enablePushNotifications(db.getCurrentUser());
      if (!result.ok) {
        showToast(result.error || 'Não foi possível ativar notificações', 'error');
        return;
      }
      uiState.pushEnabled = true;
      showToast('Notificações ativadas! 🔔');
    }
    renderApp({ skipModal: true });
  },
  // Imagem anexada: abre em pop-up. Ctrl/⌘/Shift+clique mantém o comportamento normal de link (nova aba).
  'open-attachment'(el, e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    openLightboxFromLink(el);
  },

  async 'takeover-task'(el) {
    const task = await db.takeoverTask(el.dataset.taskId);
    if (task) showToast(`Você assumiu ${task.code}`);
    renderApp();
  },

  async 'set-status'(el) {
    await changeStatus(el.dataset.taskId, el.dataset.status);
  },

  async 'toggle-checklist-item'(el) {
    await db.toggleChecklistItem(el.dataset.taskId, el.dataset.checkId);
    renderApp();
  },

  async 'delete-attachment'(el) {
    if (!confirm('Excluir este anexo? O arquivo também será apagado do armazenamento e não poderá ser recuperado.')) return;
    const result = await db.deleteAttachment(el.dataset.taskId, el.dataset.attachmentId);
    if (!result.success) return showToast(result.error || 'Erro ao excluir anexo', 'error');
    showToast('Anexo excluído');
    renderApp();
  },

  async 'delete-checklist-item'(el) {
    await db.deleteChecklistItem(el.dataset.taskId, el.dataset.checkId);
    renderApp();
  },

  async 'delete-task-prompt'(el) {
    if (!confirm('Excluir esta tarefa? Esta ação não pode ser desfeita.')) return;
    await db.deleteTask(el.dataset.taskId);
    closeModal();
    showToast('Tarefa excluída');
    renderApp({ skipModal: true });
  },

  'reset-audit-filters'() {
    uiState.auditFilters = { userId: 'ALL', date: '', action: 'ALL', search: '' };
    renderApp({ skipModal: true });
  },
};

// =============================================================================
// EVENTOS GLOBAIS
// =============================================================================
function setupEventListeners() {
  // Cliques em [data-action]
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    const handler = el && actions[el.dataset.action];
    if (handler) handler(el, e);
  });

  // Digitação: busca atualiza só a lista, sem perder o foco
  document.addEventListener('input', (e) => {
    if (e.target.id === 'kanban-search-input') {
      uiState.kanbanFilters.search = e.target.value;
      renderListOnly();
    } else if (e.target.id === 'audit-filter-search') {
      uiState.auditFilters.search = e.target.value;
      renderListOnly();
    }
  });

  // Campos que salvam ao mudar
  document.addEventListener('change', async (e) => {
    const t = e.target;

    if (t.id === 'filter-analyst-select') {
      uiState.kanbanFilters.analyst = t.value;
      return renderApp({ skipModal: true });
    }
    if (t.id === 'audit-filter-user') {
      uiState.auditFilters.userId = t.value;
      return renderListOnly();
    }
    if (t.id === 'audit-filter-date') {
      uiState.auditFilters.date = t.value;
      return renderListOnly();
    }
    if (t.id === 'audit-filter-action') {
      uiState.auditFilters.action = t.value;
      return renderListOnly();
    }
    // Status no modal: "Bloqueada" pede o motivo antes de salvar
    if (t.id === 'modal-status-select') {
      const box = document.getElementById('modal-blocked-reason-container');
      if (t.value === BLOCKED) {
        box?.classList.remove('hidden');
        document.getElementById('modal-blocked-reason-input')?.focus();
        return;
      }
      box?.classList.add('hidden');
      return changeStatus(t.dataset.taskId, t.value);
    }
    if (t.id === 'modal-blocked-reason-input') {
      return changeStatus(t.dataset.taskId, BLOCKED, t.value);
    }

    // Edição direta dos campos da tarefa
    if (t.dataset.field && t.dataset.taskId) {
      await db.updateTaskField(t.dataset.taskId, t.dataset.field, t.value);
      // Troca de responsável muda botões do modal; os demais campos não.
      renderApp({ skipModal: t.dataset.field !== 'assignedToId' });
    }
  });

  // Formulários
  document.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);

    try {
      if (form.id === 'form-quick-add') {
        const title = (data.get('title') || '').trim();
        if (!title) return;
        const created = await db.createTask({ title });
        uiState.kanbanFilters = { ...EMPTY_FILTERS }; // garante que a nova tarefa apareça
        showToast(`${created.code} criada`);
        renderApp();
        document.getElementById('quick-add-input')?.focus();
      } else if (form.id === 'form-new-task') {
        const checklist = (data.get('checklistLines') || '')
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .map((text, i) => ({ id: `chk-${Date.now()}-${i}`, text, done: false }));

        const created = await db.createTask({
          title: data.get('title'),
          system: (data.get('system') || '').trim(),
          client: (data.get('client') || '').trim(),
          ticketNumber: (data.get('ticketNumber') || '').trim(),
          priority: data.get('priority'),
          deadline: (data.get('deadline') || '').trim(),
          assignedToId: data.get('assignedToId'),
          description: data.get('description'),
          checklist,
        });
        uiState.kanbanFilters = { ...EMPTY_FILTERS };
        closeModal();
        showToast(`${created.code} criada`);
        renderApp({ skipModal: true });
      } else if (form.id === 'form-add-checklist-item') {
        const text = data.get('checkText');
        if (!text) return;
        await db.addChecklistItem(form.dataset.taskId, text);
        renderApp();
        document.getElementById('checklist-add-input')?.focus(); // permite adicionar vários em sequência
      } else if (form.id === 'form-add-comment') {
        const text = data.get('commentText');
        if (!text) return;
        await db.addComment(form.dataset.taskId, text);
        renderModalOnly();
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
      showToast(err.message || 'Não foi possível salvar. Tente de novo.', 'error');
    }
  });

  // Atalhos de teclado
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);

    if (e.key === 'Escape' && uiState.activeModal) return closeModal();

    // ⌘/Ctrl + Enter envia o comentário
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && e.target.name === 'commentText') {
      e.preventDefault();
      return e.target.form?.requestSubmit();
    }

    if (typing || uiState.activeModal || uiState.currentTab !== 'kanban' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'n') {
      e.preventDefault();
      document.getElementById('quick-add-input')?.focus();
    } else if (e.key === '/') {
      e.preventDefault();
      document.getElementById('kanban-search-input')?.focus();
    }
  });

  // Arrastar cards entre colunas
  const clearDropTargets = () => document.querySelectorAll('.drop-target').forEach((c) => c.classList.remove('drop-target'));

  document.addEventListener('dragstart', (e) => {
    const card = e.target.closest?.('.task-card');
    if (!card) return;
    draggingTaskId = card.dataset.taskId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggingTaskId);
    card.classList.add('dragging');
  });

  document.addEventListener('dragend', () => {
    draggingTaskId = null;
    document.querySelectorAll('.dragging').forEach((c) => c.classList.remove('dragging'));
    clearDropTargets();
  });

  document.addEventListener('dragover', (e) => {
    if (!draggingTaskId) return;
    const col = e.target.closest?.('[data-column-status]');
    if (!col) return;
    e.preventDefault();
    if (!col.classList.contains('drop-target')) {
      clearDropTargets();
      col.classList.add('drop-target');
    }
  });

  document.addEventListener('drop', async (e) => {
    if (!draggingTaskId) return;
    const col = e.target.closest?.('[data-column-status]');
    if (!col) return;
    e.preventDefault();

    const taskId = draggingTaskId;
    const status = col.dataset.columnStatus;
    draggingTaskId = null;
    clearDropTargets();

    const task = db.getTaskById(taskId);
    if (!task || task.status === status) return;

    let reason = '';
    if (status === BLOCKED) {
      const answer = prompt('Motivo do bloqueio:', '');
      if (answer === null) return;
      reason = answer;
    }
    await changeStatus(taskId, status, reason);
  });
}

// =============================================================================
// INICIALIZAÇÃO (login → app)
// =============================================================================
let listenersReady = false;

function showLogin(mode = 'login') {
  mountLogin(document.getElementById('app'), { initialMode: mode, onSuccess: startApp });
}

async function startApp(authUser) {
  const root = document.getElementById('app');
  root.innerHTML = '<p class="p-10 text-sm text-slate-500">Carregando...</p>';

  try {
    await db.init(authUser);
  } catch (err) {
    console.error(err);
    root.innerHTML = `
      <div class="min-h-screen flex items-center justify-center p-6">
        <div class="max-w-sm bg-white rounded-2xl shadow-card p-6 text-center space-y-4">
          <p class="text-sm font-bold text-slate-900">Não foi possível abrir o TaskHub</p>
          <p class="text-xs text-slate-500">${escapeHtml(err.message)}</p>
          <div class="flex justify-center gap-2">
            <button id="startup-retry" class="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold">Tentar de novo</button>
            <button id="startup-logout" class="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100">Sair</button>
          </div>
        </div>
      </div>`;
    document.getElementById('startup-retry').onclick = () => startApp(authUser);
    document.getElementById('startup-logout').onclick = logout;
    return;
  }

  // Se o navegador já tem uma inscrição push ativa (app já instalado e autorizado antes),
  // refletimos isso no sininho do cabeçalho sem precisar pedir de novo.
  if (isPushSupported()) {
    getExistingSubscription()
      .then((sub) => {
        uiState.pushEnabled = !!sub;
        renderApp({ skipModal: true });
      })
      .catch(() => {});
  }

  if (!listenersReady) {
    setupEventListeners();
    listenersReady = true;
  }
  renderApp();

  // Veio de um toque em notificação push (?task=ID)? Abre a tarefa direto.
  const params = new URLSearchParams(location.search);
  const deepLinkTaskId = params.get('task');
  if (deepLinkTaskId) {
    history.replaceState(null, '', location.pathname);
    openModal('task-detail', deepLinkTaskId);
  }
}

async function logout() {
  await signOut();
  location.reload(); // volta limpo para a tela de login
}

async function bootstrap() {
  const user = await getSessionUser();
  // O link de "esqueci a senha" cria uma sessão; antes de abrir o app, a pessoa define a nova senha.
  if (isRecoveryFlow()) return showLogin('recovery');
  if (!user) return showLogin();
  await startApp(user);
}

bootstrap();
registerServiceWorker();
