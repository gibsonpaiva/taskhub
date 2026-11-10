// =============================================================================
// HISTÓRICO — "o que X fez no dia Y?"
// =============================================================================

import { escapeHtml } from '../utils/markdown.js';
import { formatDateTime, timeAgo } from '../utils/dateUtils.js';

const ACTIONS = [
  ['TAKEOVER', 'Assumida'],
  ['REATRIBUIÇÃO', 'Reatribuída'],
  ['STATUS', 'Status'],
  ['BLOQUEIO', 'Bloqueio'],
  ['CONCLUSÃO', 'Conclusão'],
  ['EDIÇÃO', 'Edição'],
  ['CHECKLIST', 'Checklist'],
  ['COMENTÁRIO', 'Comentário'],
  ['ANEXO', 'Anexo'],
  ['CRIAÇÃO', 'Criação'],
];

const ACTION_STYLE = {
  TAKEOVER: 'bg-blue-100 text-blue-800',
  REATRIBUIÇÃO: 'bg-blue-100 text-blue-800',
  BLOQUEIO: 'bg-amber-100 text-amber-800',
  CONCLUSÃO: 'bg-emerald-100 text-emerald-800',
};

const selectCls = 'px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700';

export function renderAuditTimelineView({ state, filters = {} }) {
  const users = state.users || [];
  const { userId = 'ALL', date = '', action = 'ALL', search = '' } = filters;

  return `
    <div class="space-y-4">
      <div class="no-print flex flex-wrap items-center gap-2">
        <select id="audit-filter-user" class="${selectCls}">
          <option value="ALL">Todos os colaboradores</option>
          ${users.map((u) => `<option value="${u.id}" ${userId === u.id ? 'selected' : ''}>${escapeHtml(u.name)}</option>`).join('')}
        </select>

        <input type="date" id="audit-filter-date" value="${escapeHtml(date)}" class="${selectCls}" />

        <select id="audit-filter-action" class="${selectCls}">
          <option value="ALL">Todas as ações</option>
          ${ACTIONS.map(([id, label]) => `<option value="${id}" ${action === id ? 'selected' : ''}>${label}</option>`).join('')}
        </select>

        <div class="flex-1 min-w-[160px] max-w-xs flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 focus-within:border-slate-400">
          <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
          <input type="text" id="audit-filter-search" value="${escapeHtml(search)}" placeholder="Buscar" class="bg-transparent text-xs w-full focus:outline-none placeholder:text-slate-400" />
        </div>

        <button data-action="reset-audit-filters" class="text-xs font-bold text-blue-600 hover:underline">Limpar</button>
        <button onclick="window.print()" class="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200/70 flex items-center gap-1.5">
          <i data-lucide="printer" class="w-3.5 h-3.5"></i> Imprimir
        </button>
      </div>

      <div id="audit-list">${renderAuditList({ state, filters })}</div>
    </div>
  `;
}

// Somente a lista (atualizada a cada tecla da busca, sem perder o foco).
export function renderAuditList({ state, filters = {} }) {
  const users = state.users || [];
  const tasks = state.tasks || [];
  const { userId = 'ALL', date = '', action = 'ALL', search = '' } = filters;
  const q = search.toLowerCase().trim();
  const person = userId !== 'ALL' ? users.find((u) => u.id === userId) : null;

  // V2: auditLog agora é uma tabela separada em state.auditLog
  const auditLogs = state.auditLog || [];
  
  console.log('🔍 renderAuditList chamado');
  console.log('   - auditLogs:', auditLogs.length);
  console.log('   - tasks:', tasks.length);
  console.log('   - filters:', filters);
  
  // Criar mapa de tasks para lookup rápido
  const taskMap = {};
  tasks.forEach((t) => {
    taskMap[t.id] = { code: t.code, title: t.title };
  });

  // Transformar logs do formato V2 para o formato esperado pelo template
  const events = auditLogs.map((log) => {
    const task = taskMap[log.task_id] || { code: 'N/A', title: '' };
    return {
      action: log.action,
      description: log.description,
      actorName: log.actor_name || 'Sistema',
      timestamp: log.created_at,
      taskId: log.task_id,
      taskCode: task.code,
      taskTitle: task.title,
    };
  });

  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const filtered = events.filter((ev) => {
    if (person && ev.actorName !== person.name && !ev.description.includes(person.name)) return false;
    if (action !== 'ALL' && ev.action !== action) return false;
    if (date && (ev.timestamp || '').slice(0, 10) !== date) return false;
    if (q) {
      const haystack = [ev.description, ev.actorName, ev.taskCode, ev.taskTitle].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    return `<div class="bg-white rounded-xl shadow-card text-center py-12 text-xs text-slate-400">Nenhum registro para esses filtros.</div>`;
  }

  return `
    <div class="bg-white rounded-xl shadow-card divide-y divide-slate-100">
      <div class="px-4 py-2 text-[11px] text-slate-400">${filtered.length} registro${filtered.length === 1 ? '' : 's'}</div>
      ${filtered
        .map(
          (ev) => `
        <div class="px-4 py-2.5 flex items-start gap-3 hover:bg-slate-50">
          <span class="mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono shrink-0 w-[92px] text-center ${ACTION_STYLE[ev.action] || 'bg-slate-100 text-slate-600'}">${escapeHtml(ev.action)}</span>
          <div class="min-w-0 flex-1">
            <p class="text-xs text-slate-800">${escapeHtml(ev.description)}</p>
            <p class="text-[11px] text-slate-500 mt-0.5">
              <strong class="text-slate-700">${escapeHtml(ev.actorName)}</strong> ·
              <span data-action="open-task-detail" data-task-id="${ev.taskId}" class="font-mono font-bold hover:text-blue-600 cursor-pointer">${escapeHtml(ev.taskCode)}</span>
              ${escapeHtml(ev.taskTitle)}
            </p>
          </div>
          <span class="font-mono text-[10.5px] text-slate-400 text-right shrink-0">${formatDateTime(ev.timestamp)}<br/>${timeAgo(ev.timestamp)}</span>
        </div>`
        )
        .join('')}
    </div>
  `;
}
