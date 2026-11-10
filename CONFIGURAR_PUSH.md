# 🔔 Notificações Push — Guia de configuração

Esse recurso tem partes que só você consegue fazer (variáveis de ambiente na Vercel,
clique no painel do Supabase). Siga na ordem.

---

## 1. Rodar o SQL no Supabase

No **SQL Editor** do Supabase, execute o arquivo:
```
ADICIONAR_PUSH_NOTIFICATIONS.sql
```
Isso cria a tabela `push_subscriptions` (onde ficam guardados os "endereços" de push de
cada aparelho) com as permissões corretas.

---

## 2. Configurar as variáveis de ambiente na Vercel

No painel do seu projeto na Vercel → **Settings → Environment Variables**, adicione:

| Nome | Valor | Onde pegar |
|---|---|---|
| `VAPID_PUBLIC_KEY` | `BLpvKySHWtp_2c012E3vemy7hk_vIAxc5h3XwKRx_K60Ls61w256ts-M2BInpjowgpwd5XEFx9nZArI4Rx_dTxY` | já está no `.env` local |
| `VAPID_PRIVATE_KEY` | **veja o `.env` local** (chave secreta — nunca comitar o valor real no Git) | já está no `.env` local — **nunca** exponha no navegador |
| `VAPID_SUBJECT` | `mailto:gibson.paiva@taskhub.app` (ou outro e-mail seu) | livre |
| `SUPABASE_URL` | `https://yotlwfbkxwaqviqzgtkt.supabase.co` | já usado no projeto |
| `SUPABASE_SECRET_KEY` | **veja o `.env` local** | Supabase → Settings → API |
| `WEBHOOK_SECRET` | **veja o `.env` local** (chave secreta — nunca comitar o valor real no Git) | já está no `.env` local |

> As chaves acima já foram geradas especificamente para o seu projeto — é só copiar.
> Depois de configurar, faça um novo deploy (ou clique em "Redeploy") para elas valerem.

---

## 3. Configurar o Database Webhook no Supabase

No painel do Supabase → **Database → Webhooks** → **Create a new hook**:

- **Name:** `notify-task-created`
- **Table:** `tasks`
- **Events:** marque somente `Insert`
- **Type:** `HTTP Request`
- **Method:** `POST`
- **URL:** `https://SEU-DOMINIO.vercel.app/api/notify-task-created`
  (troque `SEU-DOMINIO` pela URL real depois do deploy)
- **HTTP Headers:** adicione
  - Nome: `x-webhook-secret`
  - Valor: **o mesmo `WEBHOOK_SECRET` que você colocou na Vercel** (veja seu `.env` local)

Salve. A partir daqui, toda vez que uma linha nova entrar na tabela `tasks`, o Supabase
chama sua função na Vercel automaticamente.

---

## 4. Deploy na Vercel

```bash
git add .
git commit -m "Adiciona notificações push (PWA)"
git push
```
A Vercel detecta o `package.json` e instala `web-push` e `@supabase/supabase-js`
automaticamente para a função em `/api/notify-task-created.js`.

---

## 5. No iPhone

1. Abra o link do TaskHub **no Safari** (precisa ser o Safari, não funciona em outro navegador no iPhone)
2. Toque em **Compartilhar** → **Adicionar à Tela de Início**
3. Abra o TaskHub **pelo ícone da tela de início** (não pelo Safari)
4. Toque no sininho 🔔 no canto superior direito e aceite a permissão de notificação
5. Repita nos dois iPhones (cada pessoa ativa a sua)

Pré-requisito: iOS 16.4 ou mais novo.

---

## 6. Testar

Crie uma tarefa nova no TaskHub (em qualquer um dos celulares ou no computador).
Em poucos segundos, uma notificação "Nova tarefa criada" deve aparecer nos dois
iPhones que ativaram o sininho — mesmo com o app fechado.

### Se não chegar notificação, verifique nesta ordem:
1. **Supabase → Database → Webhooks** → clique no webhook → veja o histórico de chamadas (deve mostrar status 200)
2. **Vercel → seu projeto → Functions → Logs** → veja se a função rodou e se há erro
3. Confirme que as variáveis de ambiente foram salvas e que você fez um novo deploy depois de adicioná-las
4. No iPhone, confira em **Ajustes → TaskHub → Notificações** se está permitido

---

## O que já está pronto no código
- `manifest.json` + ícones em `/img/icon-192.png` e `/img/icon-512.png`
- `sw.js` — Service Worker que recebe o push e abre a tarefa certa ao tocar
- `src/services/pushNotifications.js` — pede permissão e salva a inscrição
- Botão do sino no cabeçalho (`src/components/Header.js`)
- `api/notify-task-created.js` — função que envia o push
- Tudo isso já está no código; falta só você fazer os passos 1 a 5 acima.

## Próximo passo natural (não incluído ainda)
Alerta de "tarefa perto do prazo" rodando periodicamente (GitHub Actions ou
cron-job.org chamando uma nova função a cada X minutos). A base de push já construída
aqui serve para isso sem precisar refazer nada — é só decidir a frequência quando quiser.
