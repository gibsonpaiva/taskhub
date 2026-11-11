// =============================================================================
// SERVICE WORKER — TaskHub
// Responsável por: registrar o app como instalável, receber notificações push
// e abrir a tarefa certa quando a notificação é tocada.
// =============================================================================

const CACHE_NAME = "taskhub-sw-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Chega uma notificação push do servidor (via Web Push / APNs)
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = { title: "TaskHub", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "TaskHub";
  const options = {
    body: payload.body || "",
    icon: "/img/tarefa-concluida.png",
    badge: "/img/tarefa-concluida.png",
    data: { taskId: payload.taskId || null, url: payload.url || "/" },
    tag: payload.tag || undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Pessoa tocou na notificação: foca uma aba já aberta ou abre uma nova na tarefa certa
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
