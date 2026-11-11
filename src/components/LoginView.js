// =============================================================================
// TELA DE LOGIN (entrar, criar conta, esqueci a senha, nova senha)
// Layout de referência: card grande com painel de imagem inclinado à esquerda e
// formulário à direita. Imagem do painel: /img/tela-login.jpg
// =============================================================================

import { escapeHtml } from '../utils/markdown.js';
import * as auth from '../services/auth.js';

// Medidas do painel de imagem (px). O recorte inclinado com cantos arredondados é um
// path em pixels, então o painel tem tamanho fixo (só aparece em telas largas).
const PANEL_W = 480;
const PANEL_H = 660;
const SLANT = 36; // quanto a borda direita se desloca da base para o topo
const RADIUS = 34;

const f = (n) => Math.round(n * 10) / 10;

export function panelClipPath() {
  const W = PANEL_W;
  const H = PANEL_H;
  const r = RADIUS;
  const len = Math.hypot(SLANT, H);
  const dx = (SLANT * r) / len; // deslocamento ao longo da borda inclinada
  const dy = (H * r) / len;
  return [
    `M${r} 0`,
    `H${f(W - r)}`,
    `Q${W} 0 ${f(W - dx)} ${f(dy)}`,
    `L${f(W - SLANT + dx)} ${f(H - dy)}`,
    `Q${W - SLANT} ${H} ${f(W - SLANT - r)} ${H}`,
    `H${r}`,
    `Q0 ${H} 0 ${H - r}`,
    `V${r}`,
    `Q0 0 ${r} 0`,
    'Z',
  ].join(' ');
}

const COPY = {
  login: { title: 'Olá!', subtitle: 'Bem-vindo ao TaskHub', button: 'Entrar', busy: 'Entrando...' },
  signup: { title: 'Criar conta', subtitle: 'Preencha para começar', button: 'Criar conta', busy: 'Criando...' },
  forgot: { title: 'Recuperar senha', subtitle: 'Enviaremos um link para o seu e-mail', button: 'Enviar link', busy: 'Enviando...' },
  recovery: { title: 'Nova senha', subtitle: 'Escolha uma senha para voltar a entrar', button: 'Salvar senha', busy: 'Salvando...' },
};

const field = (label, name, type, autocomplete, value = '', extra = '') => `
  <label class="block rounded-xl border border-slate-300 bg-white px-3.5 pt-2 pb-1.5 focus-within:border-slate-500 transition-colors">
    <span class="block text-[10px] font-semibold text-slate-500">${label}</span>
    <input name="${name}" type="${type}" autocomplete="${autocomplete}" required value="${escapeHtml(value)}" ${extra}
      class="w-full text-sm text-slate-900 bg-transparent focus:outline-none" />
  </label>`;

export function renderLoginView({ mode = 'login', email = '', name = '' } = {}) {
  const copy = COPY[mode];

  const fields = {
    login: field('E-mail', 'email', 'email', 'email', email) + field('Senha', 'password', 'password', 'current-password'),
    signup:
      field('Nome', 'name', 'text', 'name', name) +
      field('E-mail', 'email', 'email', 'email', email) +
      field('Senha (mínimo 6 caracteres)', 'password', 'password', 'new-password', '', 'minlength="6"'),
    forgot: field('E-mail', 'email', 'email', 'email', email),
    recovery: field('Nova senha (mínimo 6 caracteres)', 'password', 'password', 'new-password', '', 'minlength="6"'),
  }[mode];

  const link = (target, text) =>
    `<a href="#" data-login-mode="${target}" class="font-semibold text-[#E52521] hover:underline">${text}</a>`;

  const footer = {
    login: `Não tem uma conta? ${link('signup', 'Criar conta')}`,
    signup: `Já tem uma conta? ${link('login', 'Entrar')}`,
    forgot: link('login', 'Voltar para entrar'),
    recovery: '',
  }[mode];

  return `
    <div class="relative min-h-screen overflow-hidden bg-[#EEEFF2] flex items-center justify-center p-4 sm:p-6">
      <!-- Fundo: faixa azul com borda inclinada (como na referência) -->
      <div class="absolute inset-0 pointer-events-none"
        style="background: linear-gradient(145deg, #1d4ed8 0%, #1e3a8a 55%, #172554 100%); clip-path: polygon(0 0, 68% 0, 60% 100%, 0 100%);"></div>

      <div class="relative w-full max-w-[1000px] bg-white rounded-[36px] lg:rounded-[44px] shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)] lg:h-[680px] flex">

        <!-- Painel de imagem (só em telas largas) -->
        <aside class="hidden lg:block shrink-0 m-[10px]" style="width:${PANEL_W}px;height:${PANEL_H}px;">
          <div class="relative w-full h-full overflow-hidden bg-gradient-to-br from-[#DBEAFE] via-[#EFF6FF] to-[#BFDBFE]"
            style="clip-path: path('${panelClipPath()}');">
            <img src="/img/tela-login.jpg" alt="" class="absolute inset-0 w-full h-full object-cover mix-blend-multiply" style="object-position: center 52%;" />
            <p class="absolute top-8 left-9 text-[17px] font-extrabold text-slate-900 tracking-tight">Gestão da equipe</p>
            <div class="absolute bottom-9 left-9 right-16">
              <p class="text-xl font-extrabold text-slate-900 leading-snug">Chamados, prazos e anexos<br/>em um só lugar.</p>
            </div>
          </div>
        </aside>

        <!-- Formulário -->
        <section class="flex-1 min-w-0 flex flex-col px-7 sm:px-12 lg:px-10 py-8">
          <div class="flex items-center gap-2.5">
            <img src="/img/tarefa-concluida.png" alt="TaskHub" class="w-9 h-9 rounded-xl object-cover" />
            <span class="text-2xl font-black tracking-tight text-slate-800">TaskHub</span>
          </div>

          <div class="flex-1 flex flex-col justify-center w-full max-w-[320px] mx-auto py-6">
            <h1 class="text-center text-4xl sm:text-[44px] leading-tight font-black tracking-tight text-slate-900">${copy.title}</h1>
            <p class="text-center text-sm text-slate-500 mt-2">${copy.subtitle}</p>

            <form id="login-form" class="mt-8 space-y-3">
              ${fields}

              ${
                mode === 'login'
                  ? `<div class="text-right -mt-0.5"><a href="#" data-login-mode="forgot" class="text-xs font-semibold text-[#E52521] hover:underline">Esqueci a senha</a></div>`
                  : ''
              }

              <p id="login-message" role="status" aria-live="polite" class="hidden text-[12px] rounded-lg px-3 py-2"></p>

              <button id="login-submit" type="submit"
                class="w-full h-11 rounded-full bg-[#E52521] hover:bg-[#C81E1A] disabled:opacity-60 disabled:cursor-wait text-white text-sm font-bold transition-colors">
                ${copy.button}
              </button>
            </form>

            ${footer ? `<p class="text-center text-xs text-slate-600 mt-6">${footer}</p>` : ''}
          </div>
        </section>
      </div>
    </div>`;
}

// Liga a tela: troca de modo, envio do formulário e mensagens. `onSuccess(user)` é chamado ao entrar.
export function mountLogin(root, { initialMode = 'login', onSuccess }) {
  const state = { mode: initialMode, email: '', name: '' };
  const $ = (sel) => root.querySelector(sel);

  const render = () => {
    root.innerHTML = renderLoginView(state);
    const first = { signup: 'name', recovery: 'password' }[state.mode] || 'email';
    $(`#login-form [name="${first}"]`)?.focus();
  };

  const setMessage = (type, text) => {
    const el = $('#login-message');
    if (!el) return;
    el.textContent = text || '';
    el.className = text
      ? `text-[12px] rounded-lg px-3 py-2 ${type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`
      : 'hidden';
  };

  const setBusy = (busy) => {
    const btn = $('#login-submit');
    if (!btn) return; // a tela já foi trocada pelo app
    btn.disabled = busy;
    btn.textContent = busy ? COPY[state.mode].busy : COPY[state.mode].button;
  };

  root.onclick = (e) => {
    const el = e.target.closest('[data-login-mode]');
    if (!el) return;
    e.preventDefault();
    state.mode = el.dataset.loginMode;
    render();
  };

  root.oninput = (e) => {
    if (e.target.name === 'email') state.email = e.target.value;
    if (e.target.name === 'name') state.name = e.target.value;
  };

  root.onsubmit = async (e) => {
    e.preventDefault();
    if (e.target.id !== 'login-form') return;

    const data = new FormData(e.target);
    const email = (data.get('email') || '').trim();
    const name = (data.get('name') || '').trim();
    const password = data.get('password') || '';

    setMessage('', '');
    setBusy(true);

    try {
      if (state.mode === 'login') {
        const { user, error } = await auth.signIn(email, password);
        if (error) return setMessage('error', error);
        return onSuccess(user);
      }

      if (state.mode === 'signup') {
        const { user, session, error } = await auth.signUp(email, password, name);
        if (error) return setMessage('error', error);
        if (session) return onSuccess(user); // confirmação de e-mail desligada no Supabase
        state.mode = 'login';
        render();
        return setMessage('info', `Conta criada! Enviamos um e-mail de confirmação para ${email}. Confirme e depois entre.`);
      }

      if (state.mode === 'forgot') {
        const { error } = await auth.sendResetEmail(email);
        if (error) return setMessage('error', error);
        return setMessage('info', 'Se esse e-mail tiver cadastro, você vai receber um link para criar uma nova senha.');
      }

      if (state.mode === 'recovery') {
        const { user, error } = await auth.updatePassword(password);
        if (error) return setMessage('error', error);
        history.replaceState(null, '', location.pathname); // tira o token do endereço
        return onSuccess(user);
      }
    } finally {
      setBusy(false);
    }
  };

  render();
}
