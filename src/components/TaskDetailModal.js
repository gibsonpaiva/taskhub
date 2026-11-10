// =============================================================================
// MODAL DA TAREFA — tudo em uma tela, com edição direta (salva ao sair do campo)
// =============================================================================

import { escapeHtml } from '../utils/markdown.js';
import { formatDateTime, timeAgo, toDeadlineInputValue } from '../utils/dateUtils.js';

const STATUSES = ['Não Iniciada', 'Em Andamento', 'Bloqueada / Aguardando', 'Concluída'];
const PRIORITIES = ['Crítica', 'Alta', 'Média', 'Baixa'];

const inputCls =
  'w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-slate-400';
const labelCls = 'text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1';

const options = (list, selected) =>
  list.map((v) => `<option value="${escapeHtml(v)}" ${v === selected ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('');

export function renderTaskDetailModal({ task, users, currentUser }) {
  if (!task) return '';

  const isMine = task.assignedToId === currentUser.id;
  const isBlocked = task.status === 'Bloqueada / Aguardando';
  const doneCount = task.checklist.filter((c) => c.done).length;
  const total = task.checklist.length;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;
  const deadlineValue = toDeadlineInputValue(task.deadline);
  const legacyDeadline = !!task.deadline && !deadlineValue; // texto antigo que não é uma data
  const creator = users.find((u) => u.id === task.createdById);
  const creatorName = creator ? creator.name : task.createdById ? 'Usuário removido' : 'Migração do sistema';

  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-3 modal-backdrop bg-slate-900/40">
      <div class="modal-window bg-[#F8FAFC] w-full max-w-2xl max-h-[92vh] rounded-2xl shadow-floating flex flex-col overflow-hidden">

        <!-- Topo: código, título editável, fechar -->
        <div class="px-5 pt-4 pb-3 bg-white border-b border-slate-200">
          <div class="flex items-center justify-between mb-1">
            <span class="font-mono text-[11px] font-bold text-slate-400">${escapeHtml(task.code)}</span>
            <button data-action="close-modal" title="Fechar (Esc)" class="w-7 h-7 rounded-full hover:bg-slate-100 text-slate-500 flex items-center justify-center">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
          <input
            type="text"
            value="${escapeHtml(task.title)}"
            data-field="title"
            data-task-id="${task.id}"
            class="w-full text-lg font-extrabold text-slate-900 tracking-tight bg-transparent rounded-md px-1 -mx-1 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
          />
          <div class="flex items-center gap-1.5 mt-1.5 px-1 text-[11px] text-slate-500" title="Quem abriu o chamado (não pode ser alterado)">
            <i data-lucide="user" class="w-3 h-3 text-slate-400"></i>
            <span>Aberto por <strong class="text-slate-700">${escapeHtml(creatorName)}</strong></span>
          </div>
        </div>

        <div id="modal-scroll" class="p-5 overflow-y-auto flex-1 space-y-4">

          <!-- Propriedades -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label class="${labelCls}">Status</label>
              <select id="modal-status-select" data-task-id="${task.id}" class="${inputCls} font-bold">
                ${options(STATUSES, task.status)}
              </select>
            </div>
            <div>
              <label class="${labelCls}">Responsável</label>
              <select data-field="assignedToId" data-task-id="${task.id}" class="${inputCls} font-semibold">
                ${users.map((u) => `<option value="${u.id}" ${u.id === task.assignedToId ? 'selected' : ''}>${escapeHtml(u.name)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="${labelCls}">Prioridade</label>
              <select data-field="priority" data-task-id="${task.id}" class="${inputCls} font-semibold">
                ${options(PRIORITIES, task.priority)}
              </select>
            </div>
            <div>
              <label class="${labelCls}">Prazo</label>
              <input type="datetime-local" value="${escapeHtml(deadlineValue)}" data-field="deadline" data-task-id="${task.id}" class="${inputCls} font-mono cursor-pointer" />
              ${legacyDeadline ? `<span class="text-[10px] text-slate-400 block mt-0.5 truncate" title="${escapeHtml(task.deadline)}">Antes: ${escapeHtml(task.deadline)}</span>` : ''}
            </div>
            <div class="col-span-1 sm:col-span-2">
              <label class="${labelCls}">Cliente</label>
              <input type="text" value="${escapeHtml(task.client || '')}" data-field="client" data-task-id="${task.id}" placeholder="Nome do cliente" class="${inputCls} font-semibold" />
            </div>
            <div class="col-span-1 sm:col-span-2">
              <label class="${labelCls}">Nº do chamado</label>
              <input type="text" value="${escapeHtml(task.ticketNumber || '')}" data-field="ticketNumber" data-task-id="${task.id}" placeholder="Ex: 12345" class="${inputCls} font-semibold" />
            </div>
            <div class="col-span-2 sm:col-span-4">
              <label class="${labelCls}">Sistema / ferramenta</label>
              <input type="text" value="${escapeHtml(task.system)}" data-field="system" data-task-id="${task.id}" placeholder="Opcional" class="${inputCls}" />
            </div>
          </div>

          ${
            !isMine
              ? `<button data-action="takeover-task" data-task-id="${task.id}" class="w-full py-2 rounded-lg bg-slate-900 hover:bg-[#E52521] text-white text-xs font-bold flex items-center justify-center gap-2">
                   <i data-lucide="user-check" class="w-4 h-4"></i> Assumir esta tarefa
                 </button>`
              : ''
          }

          <!-- Motivo do bloqueio (aparece ao escolher "Bloqueada") -->
          <div id="modal-blocked-reason-container" class="${isBlocked ? '' : 'hidden'}">
            <label class="${labelCls} !text-amber-600">Motivo do bloqueio (Enter para salvar)</label>
            <input
              type="text"
              id="modal-blocked-reason-input"
              data-task-id="${task.id}"
              value="${escapeHtml(task.blockedReason || '')}"
              placeholder="Ex: Aguardando liberação do time de infraestrutura"
              class="${inputCls} !border-amber-300 !bg-amber-50"
            />
          </div>

          <!-- Descrição -->
          <div>
            <label class="${labelCls}">Descrição</label>
            <textarea data-field="description" data-task-id="${task.id}" rows="3" placeholder="Contexto, links, instruções..." class="${inputCls} leading-relaxed">${escapeHtml(task.description)}</textarea>
          </div>

          <!-- Checklist -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="${labelCls} !mb-0">Checklist ${total ? `· ${doneCount}/${total}` : ''}</label>
              ${total ? `<div class="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden"><div class="h-full bg-blue-500" style="width:${percent}%"></div></div>` : ''}
            </div>
            <div class="space-y-1">
              ${task.checklist
                .map(
                  (item) => `
                <div data-action="toggle-checklist-item" data-task-id="${task.id}" data-check-id="${item.id}"
                  class="group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer select-none">
                  <span class="w-4 h-4 rounded flex items-center justify-center shrink-0 ${item.done ? 'bg-emerald-600 text-white' : 'border border-slate-300'}">
                    ${item.done ? '<i data-lucide="check" class="w-3 h-3"></i>' : ''}
                  </span>
                  <span class="text-xs flex-1 ${item.done ? 'checklist-done-text' : 'text-slate-800'}">${escapeHtml(item.text)}</span>
                  <button data-action="delete-checklist-item" data-task-id="${task.id}" data-check-id="${item.id}" title="Remover item"
                    class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600">
                    <i data-lucide="x" class="w-3.5 h-3.5"></i>
                  </button>
                </div>`
                )
                .join('')}
            </div>
            <form id="form-add-checklist-item" data-task-id="${task.id}" class="mt-1.5">
              <input type="text" id="checklist-add-input" name="checkText" autocomplete="off" required placeholder="+ Adicionar item (Enter)" class="${inputCls} !bg-transparent !border-dashed" />
            </form>
          </div>

          <!-- Anexos -->
          <div>
            <label class="${labelCls}">Anexos ${task.attachments.length ? `· ${task.attachments.length}` : ''}</label>
            <div id="dropzone-attachments" class="px-3 py-3 border-2 border-dashed border-slate-300 rounded-lg bg-white text-center text-[11px] text-slate-500 hover:border-slate-400 cursor-pointer">
              <i data-lucide="paperclip" class="w-3.5 h-3.5 inline -mt-0.5"></i>
              Cole um print (<kbd class="font-mono">⌘V</kbd> / <kbd class="font-mono">Ctrl+V</kbd>), arraste ou clique para anexar
              <input type="file" id="file-input-modal" accept="image/*,.pdf,.txt,.log" class="hidden" />
            </div>
            ${
              task.attachments.length
                ? `<div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    ${task.attachments
                      .map((att) => {
                        const isImg = att.url.startsWith('data:image') || /\.(png|jpe?g|webp|gif)$/i.test(att.fileName);
                        const url = escapeHtml(att.url);
                        const link = isImg
                          ? `href="${url}" data-action="open-attachment" data-name="${escapeHtml(att.fileName)}"`
                          : `href="${url}" target="_blank" rel="noopener"`;
                        return `
                        <div class="relative">
                        <a ${link} title="${escapeHtml(att.fileName)}"
                          class="block rounded-lg border border-slate-200 bg-white overflow-hidden hover:border-slate-400">
                          ${
                            isImg
                              ? `<img src="${url}" alt="" class="w-full h-24 object-cover" />`
                              : `<div class="h-24 flex items-center justify-center text-slate-400"><i data-lucide="file-text" class="w-7 h-7"></i></div>`
                          }
                          <div class="px-2 py-1 text-[10px] text-slate-500 truncate">${escapeHtml(att.fileName)} · ${timeAgo(att.createdAt)}</div>
                        </a>
                        <button
                          type="button"
                          data-action="delete-attachment"
                          data-task-id="${task.id}"
                          data-attachment-id="${att.id}"
                          title="Excluir anexo"
                          class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/95 text-slate-500 shadow-card flex items-center justify-center hover:bg-red-600 hover:text-white"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>
                        </button>
                        </div>`;
                      })
                      .join('')}
                  </div>`
                : ''
            }
          </div>

          <!-- Comentários -->
          <div>
            <label class="${labelCls}">Comentários ${task.comments.length ? `· ${task.comments.length}` : ''}</label>
            <form id="form-add-comment" data-task-id="${task.id}" class="flex items-start gap-2">
              <textarea name="commentText" rows="1" required placeholder="Escreva e aperte ⌘/Ctrl+Enter para enviar" class="${inputCls} resize-none"></textarea>
              <button type="submit" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0">Enviar</button>
            </form>
            <div class="space-y-2 mt-2">
              ${task.comments
                .map(
                  (c) => `
                <div class="bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <div class="flex items-center justify-between text-[10.5px] text-slate-400 mb-0.5">
                    <span class="font-bold text-slate-700">${escapeHtml(c.authorName)}</span>
                    <span class="font-mono">${timeAgo(c.createdAt)}</span>
                  </div>
                  <p class="text-xs text-slate-700 whitespace-pre-wrap">${escapeHtml(c.text)}</p>
                </div>`
                )
                .join('')}
            </div>
          </div>

          <!-- Histórico (recolhido) -->
          <details class="group">
            <summary class="${labelCls} cursor-pointer select-none hover:text-slate-600">Histórico · ${task.auditLog.length}</summary>
            <ul class="mt-1 space-y-1">
              ${task.auditLog
                .map(
                  (log) => `
                <li class="text-[11px] text-slate-600 flex gap-2">
                  <span class="font-mono text-slate-400 shrink-0">${formatDateTime(log.timestamp)}</span>
                  <span><strong class="text-slate-800">${escapeHtml(log.actorName)}</strong> · ${escapeHtml(log.description)}</span>
                </li>`
                )
                .join('')}
            </ul>
          </details>
        </div>

        <div class="px-5 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
          <span class="font-mono">Criada em ${formatDateTime(task.createdAt)}</span>
          <button data-action="delete-task-prompt" data-task-id="${task.id}" class="px-2 py-1 rounded-md hover:text-red-600 hover:bg-red-50 font-semibold">
            Excluir
          </button>
        </div>
      </div>
    </div>
  `;
}
