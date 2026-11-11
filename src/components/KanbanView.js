// =============================================================================
// QUADRO DE TAREFAS (KANBAN + LISTA)
// =============================================================================

import { escapeHtml } from '../utils/markdown.js';
import { formatDeadline } from '../utils/dateUtils.js';

const BLOCKED = 'Bloqueada / Aguardando';

const COLUMNS = [
  { id: 'Não Iniciada', title: 'A fazer', dot: 'bg-slate-400' },
  { id: 'Em Andamento', title: 'Em andamento', dot: 'bg-blue-500' },
  { id: BLOCKED, title: 'Bloqueadas', dot: 'bg-amber-500' },
  { id: 'Concluída', title: 'Concluídas', dot: 'bg-emerald-500' },
];

const PRIORITY_STYLE = {
  Crítica: 'bg-[#E52521] text-white',
  Alta: 'bg-amber-100 text-amber-800',
  Média: 'bg-blue-50 text-blue-700',
  Baixa: 'bg-slate-100 text-slate-600',
};

export function priorityBadge(priority) {
  return `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${PRIORITY_STYLE[priority] || PRIORITY_STYLE.Baixa}">${escapeHtml(priority)}</span>`;
}

// Filtra as tarefas conforme busca, filtro rápido, responsável e cliente.
function applyFilters(tasks, users, currentUser, filters) {
  const q = (filters.search || '').toLowerCase().trim();
  const quick = filters.quick || 'all';
  const analyst = filters.analyst || 'ALL';
  const client = filters.client || 'ALL';

  return tasks.filter((t) => {
    if (q) {
      const assignee = users.find((u) => u.id === t.assignedToId);
      const haystack = [t.title, t.code, t.system, t.description, assignee?.name].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (quick === 'mine' && t.assignedToId !== currentUser.id) return false;
    if (quick === 'urgent' && !(t.priority === 'Crítica' || t.priority === 'Alta')) return false;
    if (quick === 'blocked' && t.status !== BLOCKED) return false;
    if (analyst !== 'ALL' && t.assignedToId !== analyst) return false;
    if (client !== 'ALL' && t.client !== client) return false;
    return true;
  });
}

// Lista de clientes distintos presentes nas tarefas, para popular o filtro.
function uniqueClients(tasks) {
  const set = new Set(tasks.map((t) => (t.client || '').trim()).filter(Boolean));
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// Botão único e contextual: a próxima ação mais provável para a tarefa.
function quickActionButton(task, currentUser) {
  const base = 'px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0';
  const btn = (action, extra, icon, label, cls) =>
    `<button data-action="${action}" data-task-id="${task.id}" ${extra} class="${base} ${cls}">
       <i data-lucide="${icon}" class="w-3 h-3"></i><span>${label}</span>
     </button>`;

  if (task.status === 'Concluída') {
    return btn('set-status', 'data-status="Em Andamento"', 'rotate-ccw', 'Reabrir', 'text-slate-500 hover:bg-slate-100');
  }
  if (task.assignedToId !== currentUser.id) {
    return btn('takeover-task', '', 'user-check', 'Assumir', 'bg-slate-900 text-white hover:bg-[#E52521]');
  }
  if (task.status === 'Não Iniciada') {
    return btn('set-status', 'data-status="Em Andamento"', 'play', 'Iniciar', 'bg-blue-600 text-white hover:bg-blue-700');
  }
  if (task.status === 'Em Andamento') {
    return btn('set-status', 'data-status="Concluída"', 'check', 'Concluir', 'bg-emerald-600 text-white hover:bg-emerald-700');
  }
  return btn('set-status', 'data-status="Em Andamento"', 'play', 'Retomar', 'bg-amber-500 text-white hover:bg-amber-600');
}

// Resumo compacto no topo: total e quantidade por status, com barra de proporção.
function renderStatsStrip(tasks) {
  const total = tasks.length;
  const count = (status) => tasks.filter((t) => t.status === status).length;
  const todo = count('Não Iniciada');
  const doing = count('Em Andamento');
  const blocked = count(BLOCKED);
  const done = count('Concluída');

  const stat = (label, value, cls) => `
    <div class="rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 ${cls.box}">
      <span class="text-[10px] font-bold uppercase tracking-wide ${cls.label}">${label}</span>
      <span class="font-mono text-lg font-black leading-none ${cls.value}">${value}</span>
    </div>`;

  const seg = (n, color) =>
    n ? `<div class="${color}" style="width:${(n / total) * 100}%"></div>` : '';

  return `
    <div class="no-print">
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
        ${stat('Total', total, { box: 'bg-gradient-to-br from-indigo-500 to-indigo-700', label: 'text-white/80', value: 'text-white' })}
        ${stat('A fazer', todo, { box: 'bg-gradient-to-br from-slate-500 to-slate-700', label: 'text-white/80', value: 'text-white' })}
        ${stat('Em andamento', doing, { box: 'bg-gradient-to-br from-blue-500 to-blue-700', label: 'text-white/80', value: 'text-white' })}
        ${stat('Bloqueadas', blocked, { box: 'bg-amber-50', label: 'text-amber-700', value: 'text-amber-600' })}
        ${stat('Concluídas', done, { box: 'bg-emerald-50', label: 'text-emerald-700', value: 'text-emerald-600' })}
      </div>
      <div class="mt-2 flex h-1.5 rounded-full overflow-hidden bg-slate-200">
        ${total ? seg(todo, 'bg-slate-400') + seg(doing, 'bg-blue-500') + seg(blocked, 'bg-amber-500') + seg(done, 'bg-emerald-500') : ''}
      </div>
    </div>`;
}

export function renderKanbanView({ state, currentUser, filters = {}, viewMode = 'kanban' }) {
  const tasks = state.tasks || [];
  const users = state.users || [];
  const quick = filters.quick || 'all';
  const analyst = filters.analyst || 'ALL';
  const client = filters.client || 'ALL';
  const clients = uniqueClients(tasks);

  const total = tasks.length;
  const blocked = tasks.filter((t) => t.status === BLOCKED).length;

  const chip = (id, label) => `
    <button
      data-action="set-quick-filter"
      data-filter="${id}"
      class="px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
        quick === id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200/70'
      }"
    >${label}</button>`;

  return `
    <div class="space-y-4">
      ${renderStatsStrip(tasks)}

      <!-- Criar tarefa: digite e aperte Enter -->
      <form id="form-quick-add" class="no-print flex items-center gap-2 bg-white rounded-xl shadow-card p-2">
        <span class="ml-1 w-7 h-7 rounded-lg bg-[#E52521] text-white flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" class="w-4 h-4"><path d="M12 5v14M5 12h14"/></svg>
        </span>
        <input
          type="text"
          id="quick-add-input"
          name="title"
          autocomplete="off"
          placeholder="Nova tarefa: digite o título e aperte Enter"
          class="flex-1 min-w-0 text-sm bg-transparent focus:outline-none placeholder:text-slate-400"
        />
        <button type="button" data-action="open-new-task-modal" class="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 shrink-0">
          Mais opções
        </button>
      </form>

      <!-- Filtros -->
      <div class="no-print flex flex-wrap items-center gap-2">
        <div class="flex items-center gap-1 overflow-x-auto">
          ${chip('all', `Todas <span class="font-mono opacity-70">${total}</span>`)}
          ${chip('mine', 'Minhas')}
          ${chip('urgent', 'Urgentes')}
          ${chip('blocked', `Bloqueadas${blocked ? ` <span class="font-mono opacity-70">${blocked}</span>` : ''}`)}
        </div>

        <select id="filter-analyst-select" class="px-2 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700">
          <option value="ALL">Todos</option>
          ${users.map((u) => `<option value="${u.id}" ${analyst === u.id ? 'selected' : ''}>${escapeHtml(u.name)}</option>`).join('')}
        </select>

        <select id="filter-client-select" class="px-2 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700">
          <option value="ALL">Todos os clientes</option>
          ${clients.map((c) => `<option value="${escapeHtml(c)}" ${client === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
        </select>

        <div class="flex-1 min-w-[160px] max-w-xs flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 focus-within:border-slate-400">
          <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
          <input
            type="text"
            id="kanban-search-input"
            value="${escapeHtml(filters.search || '')}"
            placeholder="Buscar ( / )"
            class="bg-transparent text-xs w-full focus:outline-none placeholder:text-slate-400"
          />
        </div>

        <div class="flex items-center bg-slate-200/70 p-0.5 rounded-lg shrink-0 ml-auto">
          ${[
            ['kanban', 'columns-3', 'Quadro'],
            ['table', 'list', 'Lista'],
          ]
            .map(
              ([mode, icon, title]) => `
            <button data-action="set-view-mode" data-mode="${mode}" title="${title}"
              class="p-1.5 rounded-md ${viewMode === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}">
              <i data-lucide="${icon}" class="w-4 h-4"></i>
            </button>`
            )
            .join('')}
        </div>
      </div>

      <div id="board-content">
        ${renderBoardContent({ state, currentUser, filters, viewMode })}
      </div>
    </div>
  `;
}

// Somente a área do quadro/lista (atualizada a cada tecla da busca, sem perder o foco).
export function renderBoardContent({ state, currentUser, filters = {}, viewMode = 'kanban' }) {
  const users = state.users || [];
  const filtered = applyFilters(state.tasks || [], users, currentUser, filters);
  return viewMode === 'table' ? renderTable(filtered, users, currentUser) : renderColumns(filtered, users, currentUser);
}

function renderColumns(tasks, users, currentUser) {
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-start">
      ${COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);
        return `
          <section class="rounded-xl bg-slate-200/50 p-2 flex flex-col min-h-[220px]" data-column-status="${col.id}">
            <div class="flex items-center justify-between px-2 py-1.5">
              <span class="flex items-center gap-2 text-xs font-extrabold text-slate-700">
                <span class="w-2 h-2 rounded-full ${col.dot}"></span>${col.title}
              </span>
              <span class="font-mono text-[11px] text-slate-500">${colTasks.length}</span>
            </div>
            <div class="space-y-2 flex-1" data-role="card-list">
              <div class="text-center text-[11px] text-slate-400 py-8" data-role="empty-placeholder" style="${colTasks.length ? 'display:none' : ''}">Vazio</div>
              ${colTasks.map((t) => renderCard(t, users, currentUser)).join('')}
            </div>
          </section>`;
      }).join('')}
    </div>
  `;
}

function renderCard(task, users, currentUser) {
  const assignee = users.find((u) => u.id === task.assignedToId) || { name: 'Sem dono', initials: '--', avatarBg: 'from-slate-400 to-slate-500' };
  const total = task.checklist.length;
  const doneCount = task.checklist.filter((c) => c.done).length;
  const meta = [task.system, formatDeadline(task.deadline)].filter(Boolean).map(escapeHtml).join(' · ');

  return `
    <article
      class="task-card bg-white rounded-lg p-3 shadow-card border border-transparent cursor-pointer ${task.status === 'Concluída' ? 'opacity-70' : ''}"
      draggable="true"
      data-action="open-task-detail"
      data-task-id="${task.id}"
    >
      <div class="flex items-center gap-1.5 mb-1.5">
        <span class="font-mono text-[10px] font-bold text-slate-400">${escapeHtml(task.code)}</span>
        ${priorityBadge(task.priority)}
      </div>

      <h4 class="text-[13px] font-bold text-slate-900 leading-snug line-clamp-2">${escapeHtml(task.title)}</h4>
      
      ${task.client ? `<div class="mt-1.5 flex items-center gap-1">
        <i data-lucide="building-2" class="w-3 h-3 text-blue-600"></i>
        <span class="text-[11px] font-bold text-blue-700">${escapeHtml(task.client)}</span>
      </div>` : ''}
      
      ${meta ? `<p class="text-[11px] text-slate-500 mt-1 truncate">${meta}</p>` : ''}

      ${
        task.status === BLOCKED && task.blockedReason
          ? `<p class="mt-2 text-[11px] text-amber-800 bg-amber-50 rounded px-2 py-1 line-clamp-2">${escapeHtml(task.blockedReason)}</p>`
          : ''
      }

      ${
        total
          ? `<div class="mt-2 flex items-center gap-2">
               <div class="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                 <div class="h-full bg-blue-500" style="width:${Math.round((doneCount / total) * 100)}%"></div>
               </div>
               <span class="font-mono text-[10px] text-slate-400">${doneCount}/${total}</span>
             </div>`
          : ''
      }

      <div class="mt-2.5 flex items-center justify-between gap-2">
        <span class="flex items-center gap-1.5 min-w-0" title="${escapeHtml(assignee.name)}">
          <span class="w-5 h-5 rounded-full bg-gradient-to-tr ${assignee.avatarBg} text-white font-bold text-[9px] flex items-center justify-center shrink-0">${escapeHtml(assignee.initials)}</span>
          <span class="text-[11px] font-semibold text-slate-600 truncate">${escapeHtml(assignee.name.split(' ')[0])}</span>
        </span>
        ${quickActionButton(task, currentUser)}
      </div>
    </article>
  `;
}

function renderTable(tasks, users, currentUser) {
  return `
    <div class="bg-white rounded-xl shadow-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
            <tr>
              <th class="py-2.5 px-4">Código</th>
              <th class="py-2.5 px-3">Prioridade</th>
              <th class="py-2.5 px-3">Tarefa</th>
              <th class="py-2.5 px-3">Cliente</th>
              <th class="py-2.5 px-3">Status</th>
              <th class="py-2.5 px-3">Responsável</th>
              <th class="py-2.5 px-3">Prazo</th>
              <th class="py-2.5 px-3">Checklist</th>
              <th class="py-2.5 px-4 text-right"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${
              tasks.length === 0
                ? `<tr><td colspan="9" class="text-center py-8 text-slate-400">Nenhuma tarefa encontrada.</td></tr>`
                : tasks
                    .map((t) => {
                      const assignee = users.find((u) => u.id === t.assignedToId);
                      const doneCount = t.checklist.filter((c) => c.done).length;
                      return `
                        <tr class="hover:bg-slate-50 cursor-pointer" data-action="open-task-detail" data-task-id="${t.id}">
                          <td class="py-2.5 px-4 font-mono font-bold text-slate-500">${escapeHtml(t.code)}</td>
                          <td class="py-2.5 px-3">${priorityBadge(t.priority)}</td>
                          <td class="py-2.5 px-3 min-w-[220px]">
                            <span class="font-bold text-slate-900 block">${escapeHtml(t.title)}</span>
                            ${t.system ? `<span class="text-[11px] text-slate-500">${escapeHtml(t.system)}</span>` : ''}
                            ${t.status === BLOCKED && t.blockedReason ? `<span class="text-[11px] text-amber-700 block">${escapeHtml(t.blockedReason)}</span>` : ''}
                          </td>
                          <td class="py-2.5 px-3 font-semibold text-blue-700">${t.client ? escapeHtml(t.client) : '-'}</td>
                          <td class="py-2.5 px-3 font-semibold text-slate-700">${escapeHtml(t.status)}</td>
                          <td class="py-2.5 px-3 text-slate-700">${escapeHtml(assignee ? assignee.name : '-')}</td>
                          <td class="py-2.5 px-3 font-mono text-slate-600">${escapeHtml(formatDeadline(t.deadline) || '-')}</td>
                          <td class="py-2.5 px-3 font-mono text-slate-500">${t.checklist.length ? `${doneCount}/${t.checklist.length}` : '-'}</td>
                          <td class="py-2.5 px-4 text-right">${quickActionButton(t, currentUser)}</td>
                        </tr>`;
                    })
                    .join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}
