import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const publicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const privateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:suporte@melfy.app";
webpush.setVapidDetails(subject, publicKey, privateKey);
const admin = createClient(supabaseUrl, serviceKey);

type PushRow = { id: string; endpoint: string; p256dh: string; auth: string; device_type: string; user_id: string };
async function deliver(userId: string, payload: Record<string, unknown>, key: string) {
  const { data: inserted, error: dedupeError } = await admin.from("notification_deliveries").insert({ user_id: userId, notification_key: key }).select("id").maybeSingle();
  if (dedupeError?.code === "23505") return { skipped: true };
  if (dedupeError) throw dedupeError;
  const { data: devices, error } = await admin.from("push_subscriptions").select("*").eq("user_id", userId);
  if (error) throw error;
  let sent = 0;
  for (const row of (devices || []) as PushRow[]) {
    try {
      await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify(payload));
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", row.id);
      console.error("Push delivery failed", status, err);
    }
  }
  if (!sent) await admin.from("notification_deliveries").delete().eq("user_id", userId).eq("notification_key", key);
  return { sent };
}
function localParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Maputo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Object.fromEntries(parts.map(p => [p.type, p.value]));
}
function dateOffset(iso: string, offset: number) {
  const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0,10);
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "test") {
      const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
      if (!token) return json({ error: "Sessão necessária." }, 401);
      const client = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${token}` } } });
      const { data: { user }, error } = await client.auth.getUser(token);
      if (error || !user) return json({ error: "Sessão inválida." }, 401);
      const result = await deliver(user.id, { title: "Melfy — teste de notificações", body: "Está tudo pronto! As notificações deste dispositivo estão a funcionar. ✨", url: "/inicio", tag: "melfy-test" }, `test:${crypto.randomUUID()}`);
      return json(result);
    }
    // Accepts MELFY_CRON_SECRET from the environment or the melfy_cron_secret
    // entry stored in the project Vault, so scheduled calls stay authenticated
    // without the secret ever leaving the server side.
    const cronProvided = req.headers.get("x-cron-secret");
    const cronEnvSecret = Deno.env.get("MELFY_CRON_SECRET");
    let cronAuthorized = !!cronEnvSecret && !!cronProvided && cronProvided === cronEnvSecret;
    if (!cronAuthorized && cronProvided) {
      const { data: cronSecretRow } = await admin.schema("vault").from("decrypted_secrets")
        .select("decrypted_secret").eq("name", "melfy_cron_secret").maybeSingle();
      cronAuthorized = !!cronSecretRow?.decrypted_secret && cronProvided === cronSecretRow.decrypted_secret;
    }
    if (!cronAuthorized) return json({ error: "Não autorizado." }, 401);

    const now = new Date(); const p = localParts(now);
    const today = `${p.year}-${p.month}-${p.day}`; const tomorrow = dateOffset(today, 1);
    const currentTime = `${p.hour}:${p.minute}`;
    const { data: prefs, error: prefError } = await admin.from("notification_preferences").select("*");
    if (prefError) throw prefError;
    let processed = 0;
    for (const pref of prefs || []) {
      const { data: devices } = await admin.from("push_subscriptions").select("id").eq("user_id", pref.user_id).limit(1);
      if (!devices?.length) continue;
      if (pref.daily_reminders_enabled && (pref.daily_times || []).includes(currentTime)) {
        await deliver(pref.user_id, { title: "Hora de atualizar o Melfy ✍️", body: "Já registou as suas despesas e receitas de hoje? Leva menos de 1 minuto.", url: "/movimentacoes?new=1", tag: "daily-entry" }, `daily:${today}:${currentTime}`);
        processed++;
      }
      if (pref.fixed_bills_reminders) {
        const { data: bills, error } = await admin.from("household_bills").select("id,name,amount,due_day,last_paid_month").eq("user_id", pref.user_id).eq("active", true);
        if (error) throw error;
        for (const bill of bills || []) {
          if (bill.last_paid_month === `${p.year}-${p.month}-01`) continue;
          const due = new Date(Date.UTC(Number(p.year), Number(p.month)-1, Math.min(Number(bill.due_day), new Date(Date.UTC(Number(p.year), Number(p.month), 0)).getUTCDate()))).toISOString().slice(0,10);
          const when = due === today ? "today" : due === tomorrow ? "tomorrow" : null;
          if (!when) continue;
          const isToday = when === "today";
          const msg = isToday ? `Vencimento hoje! Não se esqueça de pagar ${bill.name} (${Number(bill.amount).toLocaleString("pt-PT")} MT).` : `Atenção: A sua conta de ${bill.name} no valor de ${Number(bill.amount).toLocaleString("pt-PT")} MT vence amanhã (dia ${bill.due_day}).`;
          await deliver(pref.user_id, { title: isToday ? "Conta fixa vence hoje" : "Conta fixa vence amanhã", body: msg, url: "/casa", tag: `bill-${bill.id}` }, `bill:${bill.id}:${due}:${when}`);
          processed++;
        }
      }
      if (pref.loans_reminders) {
        const { data: loans, error } = await admin.from("loans").select("id,person_name,amount,due_date").eq("user_id", pref.user_id).not("due_date", "is", null);
        if (error) throw error;
        const { data: loanPayments, error: paymentsError } = await admin.from("loan_payments").select("loan_id,amount").eq("user_id", pref.user_id);
        if (paymentsError) throw paymentsError;
        const paidByLoan = new Map<string, number>();
        for (const payment of loanPayments || []) paidByLoan.set(payment.loan_id, (paidByLoan.get(payment.loan_id) || 0) + Number(payment.amount));
        for (const loan of loans || []) {
          const remaining = Math.max(0, Number(loan.amount) - (paidByLoan.get(loan.id) || 0));
          if (remaining <= 0) continue;
          const when = loan.due_date === today ? "today" : loan.due_date === tomorrow ? "tomorrow" : null;
          if (!when) continue;
          const isToday = when === "today";
          const msg = isToday ? `Hoje é o dia previsto para o recebimento do empréstimo de ${loan.person_name} (${remaining.toLocaleString("pt-PT")} MT).` : `Lembrete: O pagamento do empréstimo de ${loan.person_name} (${Number(loan.amount).toLocaleString("pt-PT")} MT) está previsto para amanhã.`;
          await deliver(pref.user_id, { title: isToday ? "Empréstimo previsto para hoje" : "Empréstimo previsto para amanhã", body: msg, url: "/emprestimos", tag: `loan-${loan.id}` }, `loan:${loan.id}:${loan.due_date}:${when}`);
          processed++;
        }
      }
    }
    return json({ ok: true, processed, checkedAt: now.toISOString(), timezone: "Africa/Maputo" });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Erro interno." }, 500);
  }
});
