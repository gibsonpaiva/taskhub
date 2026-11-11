// =============================================================================
// BARRA SUPERIOR — marca, abas e usuário ativo
// =============================================================================

import { escapeHtml } from '../utils/markdown.js';

const TABS = [
  { id: 'kanban', label: 'Tarefas', icon: 'layout-grid' },
  { id: 'audit', label: 'Histórico', icon: 'history' },
];

export function renderHeader({ currentTab, state, currentUser, pushEnabled = false }) {
  const openCount = (state.tasks || []).filter((t) => t.status !== 'Concluída').length;

  return `
    <header class="no-print bg-white border-b border-slate-200">
      <div class="max-w-[1600px] mx-auto px-3 sm:px-6 h-14 flex items-center gap-2 sm:gap-4">
        <div class="flex items-center gap-2 shrink-0">
          <img src="/img/tarefa-concluida.png" alt="TaskHub" class="w-7 h-7 rounded-lg object-cover" />
          <span class="hidden sm:inline font-extrabold text-sm tracking-tight">TaskHub</span>
        </div>

        <nav class="flex items-center gap-1">
          ${TABS.map((tab) => {
            const active = currentTab === tab.id;
            return `
              <button
                data-action="go-tab"
                data-tab="${tab.id}"
                class="px-3 py-1.5 rounded-lg text-[13px] flex items-center gap-2 ${
                  active ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 font-semibold hover:bg-slate-100'
                }"
              >
                <i data-lucide="${tab.icon}" class="w-4 h-4"></i>
                <span>${tab.label}</span>
                ${
                  tab.id === 'kanban'
                    ? `<span class="font-mono text-[10px] px-1.5 rounded-full ${active ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}">${openCount}</span>`
                    : ''
                }
              </button>
            `;
          }).join('')}
        </nav>

        <div class="ml-auto flex items-center gap-2.5">
          <button
            data-action="toggle-push"
            title="${pushEnabled ? 'Notificações ativadas · tocar para desativar' : 'Ativar notificações no celular'}"
            class="w-8 h-8 rounded-lg flex items-center justify-center ${
              pushEnabled ? 'text-[#E52521] bg-red-50 hover:bg-red-100' : 'text-slate-500 hover:bg-slate-100'
            }"
          >
            <i data-lucide="${pushEnabled ? 'bell' : 'bell-off'}" class="w-4 h-4"></i>
          </button>
          <div class="w-7 h-7 rounded-full bg-gradient-to-tr ${currentUser.avatar_bg || currentUser.avatarBg || 'from-slate-500 to-slate-600'} text-white font-bold text-[11px] flex items-center justify-center shrink-0">
            ${escapeHtml(currentUser.initials || '')}
          </div>
          <span class="hidden md:inline text-xs font-semibold text-slate-800 max-w-[160px] truncate" title="${escapeHtml(currentUser.email || '')}">${escapeHtml(currentUser.name)}</span>
          <button
            data-action="logout"
            title="Sair"
            class="w-8 h-8 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          </button>
        </div>
      </div>
    </header>
  `;
}
