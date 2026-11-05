# Configuração das notificações inteligentes do Melfy

O processador Web Push vive em `supabase/functions/melfy-notifications`. O agendamento é gerido pela plataforma (HTTP schedule) e passa por uma rota interna que encaminha para a função.

## Estado atual (concluído)

1. **Migração** `supabase/migrations/20261103090000_melfy_smart_notifications.sql` — aplicada. Criou `push_subscriptions`, `notification_preferences`, `notification_deliveries`, a coluna `active` em `household_bills`, políticas RLS e permissões.
2. **Edge Function** `melfy-notifications` — publicada. Aceita a chamada agendada com `x-cron-secret` (segredo do Vault ou `MELFY_CRON_SECRET`) e testes imediatos com a sessão do utilizador (`action: "test"`).
3. **Extensões** `pg_cron` e `pg_net` — ativadas na base de dados.
4. **Vault** — entradas `melfy_project_url` e `melfy_cron_secret` criadas (o segredo cron foi gerado dentro da base de dados; ninguém o conhece em texto claro).
5. **Agendamento** — job gerido `melfy-smart-notifications-every-minute` (`* * * * *`), que chama a rota interna `/api/public/jobs/melfy-notifications` (`src/routes/api/public/jobs/melfy-notifications.ts`). A rota autentica-se com `authenticateCronRequest` e encaminha para a função com o segredo do lado do servidor. Verificado em logs: corre a cada minuto e responde 200.
6. **Service Worker** `public/sw.js` — registado pela secção de notificações em Configurações quando o utilizador ativa as notificações.

## O que falta (depende do utilizador)

- **`VITE_VAPID_PUBLIC_KEY`** — a chave pública VAPID precisa de estar disponível para o frontend (ela é pública e pode ficar no código). Enquanto faltar, os utilizadores não conseguem subscrever o dispositivo.

## Como testar

1. Em **Perfil e definições → Lembretes e Notificações**, clique em "Ativar notificações" (requer HTTPS e navegador com suporte; no iPhone/iPad normalmente exige a app instalada no ecrã principal).
2. Clique em "Enviar notificação de teste" — a função envia com o fuso `Africa/Maputo`.
3. Os lembretes diários seguem os horários definidos (1–3 por dia); os de contas fixas e empréstimos disparam um dia antes e no próprio dia do vencimento. A tabela `notification_deliveries` impede envios repetidos.
