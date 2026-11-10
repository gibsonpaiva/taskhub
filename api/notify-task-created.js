// =============================================================================
// FUNÇÃO SERVERLESS (Vercel) — dispara notificação push quando uma tarefa é criada
// Chamada automaticamente pelo Database Webhook do Supabase (INSERT em "tasks").
// =============================================================================

const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  // Segurança: só aceita chamadas que conhecem o segredo configurado no webhook do Supabase.
  const secret = req.headers['x-webhook-secret'];
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    res.status(401).json({ error: 'Não autorizado' });
    return;
  }

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.error('Variáveis de ambiente de push não configuradas na Vercel.');
    res.status(500).json({ error: 'Configuração incompleta no servidor' });
    return;
  }

  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:contato@taskhub.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const body = req.body || {};
  const record = body.record || body; // aceita tanto o formato do webhook quanto uma chamada manual de teste

  if (!record || !record.id) {
    res.status(400).json({ error: 'Payload sem a tarefa criada (record)' });
    return;
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

  const { data: subscriptions, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth');

  if (error) {
    console.error('Erro ao buscar inscrições push:', error);
    res.status(500).json({ error: 'Erro ao buscar inscrições' });
    return;
  }

  const payload = JSON.stringify({
    title: 'Nova tarefa criada',
    body: `${record.code || ''} · ${record.title || ''}`.trim(),
    taskId: record.id,
    url: `/?task=${record.id}`,
    tag: `task-${record.id}`,
  });

  let sent = 0;
  let removed = 0;

  await Promise.all(
    (subscriptions || []).map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(pushSubscription, payload);
        sent += 1;
      } catch (err) {
        // 404/410 = inscrição expirada ou cancelada no navegador: limpamos do banco.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
          removed += 1;
        } else {
          console.error('Falha ao enviar push para', sub.endpoint, err.statusCode, err.body);
        }
      }
    })
  );

  res.status(200).json({ ok: true, sent, removed, total: (subscriptions || []).length });
};
