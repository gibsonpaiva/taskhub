// =============================================================================
// AUTENTICAÇÃO (Supabase Auth, e-mail + senha)
// =============================================================================

import { supabase } from './supabaseClient.js';

// O link de "esqueci a senha" volta para o app com #type=recovery. Guardamos isso logo
// no carregamento, antes da biblioteca limpar o endereço.
let recoveryFlow = /type=recovery/.test(location.hash);
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') recoveryFlow = true;
});

export const isRecoveryFlow = () => recoveryFlow;

const appUrl = () => location.origin + location.pathname;

export function translateAuthError(error) {
  const msg = String(error?.message || error || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();

  if (msg.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar. Procure o link na sua caixa de entrada.';
  if (msg.includes('already registered') || code === 'user_already_exists') return 'Este e-mail já tem cadastro. Use "Entrar".';
  if (code === 'weak_password' || msg.includes('at least 6') || msg.includes('password should be')) {
    return 'A senha precisa ter pelo menos 6 caracteres.';
  }
  if (msg.includes('different from the old') || code === 'same_password') return 'A nova senha precisa ser diferente da atual.';
  if (msg.includes('rate limit') || code.includes('rate_limit') || error?.status === 429) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  }
  if (msg.includes('signups not allowed') || code === 'signup_disabled') {
    return 'O cadastro de novos usuários está desativado. Peça acesso ao administrador.';
  }
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'Sem conexão com o servidor. Verifique sua internet.';
  if (msg.includes('invalid email') || code === 'email_address_invalid') return 'Digite um e-mail válido.';

  console.error('Erro de autenticação não mapeado:', error);
  return 'Não foi possível concluir. Tente novamente.';
}

export async function getSessionUser() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user || null;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { user: data?.user || null, error: error ? translateAuthError(error) : null };
}

export async function signUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: appUrl() },
  });
  return {
    user: data?.user || null,
    session: data?.session || null,
    error: error ? translateAuthError(error) : null,
  };
}

export async function sendResetEmail(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
  return { error: error ? translateAuthError(error) : null };
}

export async function updatePassword(password) {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (!error) recoveryFlow = false;
  return { user: data?.user || null, error: error ? translateAuthError(error) : null };
}

export async function signOut() {
  await supabase.auth.signOut();
}
