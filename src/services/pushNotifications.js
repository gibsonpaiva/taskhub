// =============================================================================
// NOTIFICAÇÕES PUSH (PWA no iOS 16.4+ / Android / desktop)
// Registra o Service Worker, pede permissão, inscreve no push e salva a
// inscrição no Supabase para o servidor poder enviar notificações depois.
// =============================================================================

import { supabase } from './supabaseClient.js';

// Chave pública VAPID (não é segredo — identifica o servidor que pode te notificar).
// A chave PRIVADA correspondente fica só na Vercel, nunca no navegador.
const VAPID_PUBLIC_KEY = 'BLpvKySHWtp_2c012E3vemy7hk_vIAxc5h3XwKRx_K60Ls61w256ts-M2BInpjowgpwd5XEFx9nZArI4Rx_dTxY';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.error('Falha ao registrar Service Worker:', err);
    return null;
  }
}

// Já tem uma inscrição ativa neste aparelho/navegador?
export async function getExistingSubscription() {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

// Pede permissão, cria a inscrição push e salva no Supabase ligada ao usuário atual.
export async function enablePushNotifications(currentUser) {
  if (!isPushSupported()) {
    return { ok: false, error: 'Este navegador não suporta notificações push.' };
  }
  if (VAPID_PUBLIC_KEY.startsWith('SUBSTITUA')) {
    return { ok: false, error: 'Chave VAPID ainda não configurada no projeto.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, error: 'Permissão de notificação não foi concedida.' };
  }

  const reg = await registerServiceWorker();
  if (!reg) return { ok: false, error: 'Não foi possível registrar o Service Worker.' };
  await navigator.serviceWorker.ready;

  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = subscription.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: currentUser.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: 'endpoint' }
  );

  if (error) {
    console.error('Erro ao salvar inscrição push:', error);
    return { ok: false, error: 'Inscrição criada, mas não foi possível salvar no servidor.' };
  }

  return { ok: true };
}

export async function disablePushNotifications() {
  const subscription = await getExistingSubscription();
  if (!subscription) return { ok: true };

  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
  await subscription.unsubscribe();
  return { ok: true };
}
