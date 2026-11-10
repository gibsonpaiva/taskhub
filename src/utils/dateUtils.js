// =============================================================================
// UTILITÁRIOS DE FORMATAÇÃO DE DATA, HORÁRIOS E SLAs
// =============================================================================

export function formatDateTime(isoString) {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  } catch (e) {
    return isoString;
  }
}

export function formatDateOnly(isoString) {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return isoString;
  }
}

export function formatTimeOnly(isoString) {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (e) {
    return isoString;
  }
}

export function timeAgo(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'agora mesmo';
    if (diffMin < 60) return `há ${diffMin} min`;
    if (diffHour < 24) return `há ${diffHour}h`;
    if (diffDays === 1) return 'ontem';
    return `há ${diffDays} dias`;
  } catch (e) {
    return '';
  }
}

// =============================================================================
// PRAZO (seletor de data + hora)
// Guardado como texto "AAAA-MM-DDTHH:mm" (hora local). Prazos antigos digitados
// à mão ("Hoje, 18:00", "18/07/2027") continuam sendo exibidos normalmente.
// =============================================================================

const DEFAULT_DEADLINE_TIME = '18:00';
const pad = (n) => String(n).padStart(2, '0');
const ISO_DEADLINE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/;
const BR_DEADLINE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/;

// Valor aceito por <input type="datetime-local">; '' se o texto antigo não for uma data.
export function toDeadlineInputValue(deadline) {
  const text = (deadline || '').trim();
  let m = text.match(ISO_DEADLINE);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4] ? `${m[4]}:${m[5]}` : DEFAULT_DEADLINE_TIME}`;
  m = text.match(BR_DEADLINE);
  if (m) {
    const time = m[4] ? `${pad(m[4])}:${m[5]}` : DEFAULT_DEADLINE_TIME;
    return `${m[3]}-${pad(m[2])}-${pad(m[1])}T${time}`;
  }
  return '';
}

// Texto para exibir: "18/07/2027 14:30". Textos antigos voltam como estão.
export function formatDeadline(deadline) {
  const text = (deadline || '').trim();
  const m = text.match(ISO_DEADLINE);
  if (!m) return text;
  return `${m[3]}/${m[2]}/${m[1]}${m[4] ? ` ${m[4]}:${m[5]}` : ''}`;
}

// Sugestão para tarefa nova: próximo 18:00 (hoje, ou amanhã se já passou).
export function defaultDeadlineValue() {
  const d = new Date();
  const [h, min] = DEFAULT_DEADLINE_TIME.split(':').map(Number);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, min);
  if (d >= target) target.setDate(target.getDate() + 1);
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${DEFAULT_DEADLINE_TIME}`;
}
