# Configuração das notificações inteligentes do Melfy

O código da aplicação e o processador Web Push estão em `supabase/functions/melfy-notifications`. Para receber notificações com o Melfy fechado, conclua os passos abaixo no projeto Lovable Cloud/Supabase.

## 1. Aplicar a migração

Aplique `supabase/migrations/20261103090000_melfy_smart_notifications.sql` no banco de dados do projeto. Ela cria:
- `push_subscriptions` e políticas RLS por utilizador;
- `notification_preferences` com horários e opções;
- `notification_deliveries` para impedir duplicados;
- coluna `active` em `household_bills`.

## 2. Gerar e configurar chaves VAPID

Gere um par de chaves VAPID (por exemplo, com `npx web-push generate-vapid-keys`). Configure:

**Variável pública do frontend (Lovable):**
- `VITE_VAPID_PUBLIC_KEY` = chave pública VAPID.

**Secrets das Edge Functions (Supabase):**
- `VAPID_PUBLIC_KEY` = mesma chave pública;
- `VAPID_PRIVATE_KEY` = chave privada;
- `VAPID_SUBJECT` = endereço de contacto, por exemplo `mailto:suporte@seudominio.com`;
- `MELFY_CRON_SECRET` = segredo aleatório forte para proteger o processador agendado.

Nunca coloque a chave privada VAPID nem o segredo cron em variáveis `VITE_*` ou no código do navegador.

## 3. Publicar a Edge Function

Publique a função `melfy-notifications` no projeto Supabase. A função usa autenticação do utilizador para o teste imediato e exige `x-cron-secret` para processar lembretes em lote.

## 4. Agendar o processador (uma vez por minuto)

Os horários são personalizáveis ao minuto. Por isso, o processador precisa de correr **a cada minuto** (um agendamento apenas de hora a hora não consegue respeitar horários como 12:30).

Ative as extensões `pg_cron` e `pg_net` no Supabase e guarde no Vault:
- `melfy_project_url` = URL do projeto Supabase;
- `melfy_service_role_key` = service role key (segredo);
- `melfy_cron_secret` = o mesmo valor de `MELFY_CRON_SECRET`.

Depois execute no SQL Editor (ajuste o nome do job se já existir):

```sql
select cron.schedule(
  'melfy-smart-notifications-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'melfy_project_url')
      || '/functions/v1/melfy-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'melfy_service_role_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'melfy_cron_secret')
    ),
    body := '{"action":"process"}'::jsonb
  );
  $$
);
```

O processador utiliza `Africa/Maputo` (UTC+2), verifica horários diários, contas fixas ativas e empréstimos com data prevista. A tabela de entregas evita que tentativas repetidas enviem o mesmo aviso duas vezes.

## 5. Compatibilidade

Web Push exige HTTPS e suporte do navegador. Em iPhone/iPad, a disponibilidade depende da versão do iOS e, normalmente, de a aplicação estar instalada no ecrã principal. O som e a apresentação final são controlados pelo sistema operativo; a aplicação pede vibração e usa o ícone Melfy, mas não consegue forçar som em todos os dispositivos.
