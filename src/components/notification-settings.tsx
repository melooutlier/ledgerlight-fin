import { useEffect, useState } from "react";
import { Bell, BellOff, Clock3, Smartphone, Monitor, Send, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Preferences = { daily_reminders_enabled: boolean; daily_times: string[]; fixed_bills_reminders: boolean; loans_reminders: boolean };
const DEFAULTS: Preferences = { daily_reminders_enabled: true, daily_times: ["12:30", "20:00"], fixed_bills_reminders: true, loans_reminders: true };
const VAPID_KEY = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env.VITE_VAPID_PUBLIC_KEY;

function decodeKey(value: string) {
  const padded = value + "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
}
function deviceType(): "mobile" | "desktop" {
  return typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? "mobile" : "desktop";
}
function arrayBufferToBase64(value: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(value)));
}

export function NotificationSettings() {
  const { data: user } = useCurrentUser();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const [{ data, error }, { data: pushRows }] = await Promise.all([
        supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("push_subscriptions").select("id").eq("user_id", user.id),
      ]);
      if (!alive) return;
      if (error) toast.error("Não foi possível carregar as preferências de notificações.");
      if (data) setPrefs({ daily_reminders_enabled: data.daily_reminders_enabled, daily_times: data.daily_times?.length ? data.daily_times : DEFAULTS.daily_times, fixed_bills_reminders: data.fixed_bills_reminders, loans_reminders: data.loans_reminders });
      setSubscribed(Boolean(pushRows?.length));
      if ("Notification" in window) setPermission(Notification.permission);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  async function save(next: Preferences) {
    if (!user) return;
    setPrefs(next);
    const { error } = await supabase.from("notification_preferences").upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() });
    if (error) { toast.error(error.message); return; }
    toast.success("Preferências guardadas.");
  }

  async function enablePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      toast.error("Este navegador não suporta notificações push. Experimente instalar/abrir o Melfy num navegador atualizado.");
      return;
    }
    if (!VAPID_KEY) { toast.error("Falta configurar VITE_VAPID_PUBLIC_KEY no Lovable Cloud."); return; }
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") throw new Error(result === "denied" ? "Permissão bloqueada nas definições do navegador." : "Permissão de notificações não concedida.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(VAPID_KEY) });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth || !user) throw new Error("Não foi possível obter os dados da subscrição deste dispositivo.");
      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: user.id, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth,
        device_type: deviceType(), updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,endpoint" });
      if (error) throw error;
      setSubscribed(true);
      toast.success("Notificações ativadas neste dispositivo.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível ativar as notificações."); }
    finally { setBusy(false); }
  }

  async function disablePush() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
        if (error) throw error;
      }
      setSubscribed(false);
      toast.success("Notificações desativadas neste dispositivo.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível desativar."); }
    finally { setBusy(false); }
  }

  async function sendTest() {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("melfy-notifications", { body: { action: "test" } });
      if (error) throw error;
      if (data?.sent === 0) throw new Error("Não foi possível entregar a notificação. Confirme a subscrição e as chaves VAPID.");
      toast.success("Notificação de teste enviada.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao enviar a notificação de teste."); }
    finally { setBusy(false); }
  }

  const patch = (value: Partial<Preferences>) => void save({ ...prefs, ...value });
  const statusText = typeof window === "undefined" || !("Notification" in window) ? "Não suportado neste navegador" : permission === "denied" ? "Bloqueadas nas definições do navegador" : subscribed ? "Ativas neste dispositivo" : "Ainda não ativadas";

  return <section className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
    <div className="flex items-start gap-3">
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><Bell className="size-5" /></div>
      <div className="min-w-0 flex-1"><h2 className="font-semibold">Lembretes e Notificações</h2><p className="mt-1 text-sm text-muted-foreground">Receba avisos do Melfy no telemóvel ou computador, mesmo quando a aplicação estiver fechada.</p></div>
    </div>
    <div className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-background">{deviceType() === "mobile" ? <Smartphone className="size-4" /> : <Monitor className="size-4" />}</div><div><p className="text-sm font-semibold">{statusText}</p><p className="text-xs text-muted-foreground">A autorização é específica para cada dispositivo e navegador.</p></div></div>
      <Button variant={subscribed ? "outline" : "default"} disabled={busy || loading} onClick={() => void (subscribed ? disablePush() : enablePush())}>{subscribed ? <><BellOff className="mr-2 size-4" /> Desativar neste dispositivo</> : <><Bell className="mr-2 size-4" /> Ativar notificações</>}</Button>
    </div>
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">Lembrete diário de registo</h3><p className="text-sm text-muted-foreground">Um incentivo para registar receitas e despesas.</p></div><input aria-label="Ativar lembrete diário" type="checkbox" className="mt-1 size-5 accent-primary" checked={prefs.daily_reminders_enabled} onChange={e => patch({ daily_reminders_enabled: e.target.checked })} /></div>
      <div className="space-y-3 rounded-xl border p-4">
        <div className="flex items-center gap-2 text-sm font-medium"><Clock3 className="size-4 text-muted-foreground" /> Horários diários · Fuso horário de Moçambique</div>
        {prefs.daily_times.map((time, index) => <div key={index} className="flex items-end gap-2"><div className="min-w-0 flex-1 space-y-1"><Label htmlFor={`daily-time-${index}`}>{index === 0 ? "Primeiro lembrete" : index === 1 ? "Segundo lembrete" : "Terceiro lembrete"}</Label><Input id={`daily-time-${index}`} type="time" value={time} disabled={!prefs.daily_reminders_enabled} onChange={e => { const daily_times = [...prefs.daily_times]; daily_times[index] = e.target.value; patch({ daily_times }); }} /></div>{prefs.daily_times.length > 1 && <Button type="button" variant="ghost" size="icon" aria-label="Remover horário" disabled={!prefs.daily_reminders_enabled} onClick={() => patch({ daily_times: prefs.daily_times.filter((_, i) => i !== index) })}><Trash2 className="size-4" /></Button>}</div>)}
        <Button type="button" variant="outline" size="sm" disabled={!prefs.daily_reminders_enabled || prefs.daily_times.length >= 3} onClick={() => patch({ daily_times: [...prefs.daily_times, "18:00"] })}><Plus className="mr-2 size-4" /> Adicionar horário ({prefs.daily_times.length}/3)</Button>
      </div>
    </div>
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">Contas Fixas e Pagamentos</h3><p className="text-sm text-muted-foreground">Avisos um dia antes e no próprio dia do vencimento.</p></div><input aria-label="Ativar lembretes de contas fixas" type="checkbox" className="mt-1 size-5 accent-primary" checked={prefs.fixed_bills_reminders} onChange={e => patch({ fixed_bills_reminders: e.target.checked })} /></div>
      <div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">Empréstimos</h3><p className="text-sm text-muted-foreground">Avisos um dia antes e na data prevista de recebimento.</p></div><input aria-label="Ativar lembretes de empréstimos" type="checkbox" className="mt-1 size-5 accent-primary" checked={prefs.loans_reminders} onChange={e => patch({ loans_reminders: e.target.checked })} /></div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="max-w-md text-xs text-muted-foreground">As notificações de vencimentos usam as despesas fixas ativas e a data prevista dos empréstimos registados no Melfy.</p><Button variant="outline" disabled={!subscribed || busy} onClick={() => void sendTest()}><Send className="mr-2 size-4" /> Enviar notificação de teste</Button></div>
  </section>;
}
