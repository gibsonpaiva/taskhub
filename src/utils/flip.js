// =============================================================================
// FLIP (First-Last-Invert-Play) — anima a troca de posição dos cards do quadro
// quando uma tarefa muda de coluna/ordem, em vez do "pulo" seco de antes.
// Funciona tanto para reordenar nós já existentes (arrastar ao vivo) quanto
// para o caso em que o board inteiro é substituído por um novo HTML após
// salvar no banco: basta casar os elementos pelo mesmo data-task-id.
// =============================================================================

const SELECTOR = '.task-card[data-task-id]';

// Mede a posição atual de todos os cards visíveis (chamar ANTES de qualquer
// mudança no DOM: reordenar, ou substituir o innerHTML do quadro).
export function snapshotPositions() {
  const map = new Map();
  document.querySelectorAll(SELECTOR).forEach((card) => {
    map.set(card.dataset.taskId, card.getBoundingClientRect());
  });
  return map;
}

// Compara a posição anterior com a atual e anima a diferença via transform.
// Chamar DEPOIS da mudança no DOM já ter sido aplicada.
export function playFlip(before, { duration = 260 } = {}) {
  document.querySelectorAll(SELECTOR).forEach((card) => {
    const prev = before.get(card.dataset.taskId);
    if (!prev) return; // card novo (não existia antes): não há de onde animar

    const next = card.getBoundingClientRect();
    const dx = prev.left - next.left;
    const dy = prev.top - next.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

    card.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
      { duration, easing: 'cubic-bezier(.22, .8, .25, 1)' }
    );
  });
}

// Pequeno pulso de destaque no card que acabou de "pousar" na coluna nova.
export function pulseLanding(taskId) {
  const card = document.querySelector(`${SELECTOR}[data-task-id="${taskId}"]`);
  if (!card) return;
  card.classList.remove('card-landed');
  void card.offsetWidth; // força reflow para permitir reiniciar a animação
  card.classList.add('card-landed');
  card.addEventListener('animationend', () => card.classList.remove('card-landed'), { once: true });
}

// Mostra/esconde o aviso "Vazio" de uma coluna conforme ela tenha cards ou não.
// Usado durante o arrasto ao vivo, quando cards entram/saem de uma coluna sem
// que o HTML seja re-renderizado.
export function syncEmptyPlaceholder(list) {
  if (!list) return;
  const placeholder = list.querySelector('[data-role="empty-placeholder"]');
  if (!placeholder) return;
  placeholder.style.display = list.querySelector('.task-card') ? 'none' : '';
}
