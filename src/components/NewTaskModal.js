// =============================================================================
// MODAL DE NOVA TAREFA (opções completas; o atalho rápido fica no topo do quadro)
// =============================================================================

import { escapeHtml } from '../utils/markdown.js';
import { defaultDeadlineValue } from '../utils/dateUtils.js';

const inputCls =
  'w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-slate-400';
const labelCls = 'text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1';

export function renderNewTaskModal({ users, currentUser }) {
  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-3 modal-backdrop bg-slate-900/40">
      <div class="modal-window bg-white w-full max-w-lg max-h-[92vh] rounded-2xl shadow-floating flex flex-col overflow-hidden">
        <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 class="text-sm font-extrabold">Nova tarefa</h2>
          <button data-action="close-modal" title="Fechar (Esc)" class="w-7 h-7 rounded-full hover:bg-slate-100 text-slate-500 flex items-center justify-center">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <form id="form-new-task" class="p-5 overflow-y-auto space-y-4">
          <div>
            <label class="${labelCls}">Título *</label>
            <input type="text" name="title" id="new-task-title" required autocomplete="off" class="${inputCls} !text-sm font-semibold" />
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="${labelCls}">Responsável</label>
              <select name="assignedToId" class="${inputCls}">
                ${users.map((u) => `<option value="${u.id}" ${u.id === currentUser.id ? 'selected' : ''}>${escapeHtml(u.name)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="${labelCls}">Prioridade</label>
              <select name="priority" class="${inputCls}">
                <option>Média</option><option>Alta</option><option>Crítica</option><option>Baixa</option>
              </select>
            </div>
            <div>
              <label class="${labelCls}">Prazo</label>
              <input type="datetime-local" name="deadline" value="${defaultDeadlineValue()}" class="${inputCls} font-mono cursor-pointer" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="${labelCls}">Cliente</label>
              <input type="text" name="client" autocomplete="off" placeholder="Nome do cliente" class="${inputCls}" />
            </div>
            <div>
              <label class="${labelCls}">Nº do chamado</label>
              <input type="text" name="ticketNumber" autocomplete="off" placeholder="Ex: 12345" class="${inputCls}" />
            </div>
          </div>

          <div>
            <label class="${labelCls}">Sistema / ferramenta (opcional)</label>
            <input type="text" name="system" autocomplete="off" placeholder="Ex: Veeam, Jira, interno" class="${inputCls}" />
          </div>

          <div>
            <label class="${labelCls}">Descrição</label>
            <textarea name="description" rows="3" class="${inputCls} leading-relaxed"></textarea>
          </div>

          <div>
            <label class="${labelCls}">Checklist (um item por linha)</label>
            <textarea name="checklistLines" rows="3" class="${inputCls} font-mono"></textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-1">
            <button type="button" data-action="close-modal" class="px-4 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button type="submit" class="px-5 py-2 rounded-lg bg-[#E52521] hover:bg-[#C81E1A] text-white text-xs font-bold">Criar</button>
          </div>
        </form>
      </div>
    </div>
  `;
}
