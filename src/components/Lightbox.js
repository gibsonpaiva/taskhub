// =============================================================================
// VISUALIZADOR DE ANEXOS (pop-up). Fecha com Esc, X ou clique fora; setas navegam.
// Módulo independente: guarda o próprio estado e registra os próprios eventos.
// =============================================================================

import { escapeHtml } from '../utils/markdown.js';

const ROOT_ID = 'lightbox-root';
let state = null; // { items: [{ url, name }], index }

const icon = (path) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5">${path}</svg>`;

export const isLightboxOpen = () => !!state;

// Abre a partir de um <a data-action="open-attachment">, navegando entre todas as imagens da tela.
export function openLightboxFromLink(link) {
  const links = [...document.querySelectorAll('a[data-action="open-attachment"]')];
  const items = links.map((a) => ({ url: a.getAttribute('href'), name: a.dataset.name || '' }));
  openLightbox(items, Math.max(0, links.indexOf(link)));
}

export function openLightbox(items, index = 0) {
  if (!items.length) return;
  state = { items, index };
  render();
}

export function closeLightbox() {
  state = null;
  document.getElementById(ROOT_ID)?.remove();
}

function move(delta) {
  if (!state || state.items.length < 2) return;
  const n = state.items.length;
  state.index = (state.index + delta + n) % n;
  render();
}

function render() {
  if (!state) return;
  const { items, index } = state;
  const item = items[index];
  const many = items.length > 1;

  let root = document.getElementById(ROOT_ID);
  const alreadyOpen = !!root;
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    document.body.appendChild(root);
  }

  const navBtn = (dir, side, path, label) =>
    `<button data-lb="${dir}" title="${label}" class="absolute ${side} top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center">${icon(path)}</button>`;

  root.innerHTML = `
    <div data-lb="backdrop" role="dialog" aria-modal="true" aria-label="Visualizar anexo"
      class="fixed inset-0 z-[80] flex flex-col items-center justify-center p-4 bg-black/85 modal-backdrop ${alreadyOpen ? 'no-anim' : ''} no-print">
      <button data-lb="close" title="Fechar (Esc)" class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center">
        ${icon('<path d="M18 6 6 18M6 6l12 12"/>')}
      </button>
      ${many ? navBtn('prev', 'left-4', '<path d="m15 18-6-6 6-6"/>', 'Anterior (←)') : ''}
      ${many ? navBtn('next', 'right-4', '<path d="m9 18 6-6-6-6"/>', 'Próximo (→)') : ''}
      <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.name)}" class="max-w-[92vw] max-h-[80vh] object-contain rounded-lg shadow-floating bg-white/5" />
      <div class="mt-3 flex items-center gap-4 text-white text-xs">
        <span class="font-semibold truncate max-w-[50vw]">${escapeHtml(item.name)}</span>
        ${many ? `<span class="font-mono opacity-70">${index + 1}/${items.length}</span>` : ''}
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" class="underline opacity-80 hover:opacity-100">Abrir em nova aba</a>
      </div>
    </div>`;
}

// Eventos próprios (fase de captura, para ter prioridade sobre o resto do app)
window.addEventListener(
  'click',
  (e) => {
    if (!state) return;
    const el = e.target.closest?.('[data-lb]');
    if (!el) return;
    const kind = el.dataset.lb;
    if (kind === 'backdrop' && e.target !== el) return; // clique na imagem/legenda não fecha
    e.preventDefault();
    e.stopPropagation();
    if (kind === 'prev') move(-1);
    else if (kind === 'next') move(1);
    else closeLightbox(); // 'close' e 'backdrop'
  },
  true
);

window.addEventListener(
  'keydown',
  (e) => {
    if (!state) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') move(-1);
    else if (e.key === 'ArrowRight') move(1);
    else return;
    e.preventDefault();
    e.stopPropagation(); // Esc não fecha também a tarefa que está por baixo
  },
  true
);
