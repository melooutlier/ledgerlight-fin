import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useClearDemoData, useCurrentUser, usePlan } from "@/lib/data";
import { PLANS } from "@/lib/plans";
import { dateLabel } from "@/lib/format";

import { applyTheme, THEME_KEY, type ThemeChoice } from "@/lib/theme";
import { NotificationSettings } from "@/components/notification-settings";


export const Route = createFileRoute("/_authenticated/configuracoes")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Perfil e definições — Melfy" },
      { name: "description", content: "Gerir o perfil, aparência e subscrição Melfy." },
      { property: "og:title", content: "Perfil e definições — Melfy" },
      { property: "og:description", content: "Gerir o perfil, aparência e subscrição Melfy." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: user } = useCurrentUser();
  const { plan, subscription, isAdmin } = usePlan();
  const clearDemo = useClearDemoData();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<ThemeChoice>("system");

  useEffect(() => {
    let saved: ThemeChoice = "system";
    try {
      const value = window.localStorage.getItem(THEME_KEY);
      if (value === "light" || value === "dark" || value === "system") saved = value;
    } catch { /* use system preference when storage is unavailable */ }
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function changeTheme(value: ThemeChoice) {
    setTheme(value);
    applyTheme(value);
    try { window.localStorage.setItem(THEME_KEY, value); } catch { /* preference remains active for this session */ }
  }

  const metadata = user?.user_metadata ?? {};
  const name = (metadata["display_name"] as string | undefined) ?? (metadata["full_name"] as string | undefined) ?? "";
  const phone = (metadata["phone"] as string | undefined) ?? "";

  return (
    <div className="space-y-6">
      <PageHeader title="Perfil e definições" subtitle="Personalize a sua experiência Melfy." />

      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-lg font-bold text-accent-foreground">
            {(name || user?.email || "M").slice(0, 1).toUpperCase()}
          </div>
          <div><h2 className="font-semibold">Dados pessoais</h2><p className="text-sm text-muted-foreground">O email é apenas de leitura.</p></div>
        </div>
        <AccountForm initialName={name} initialPhone={phone} email={user?.email ?? ""} />
      </section>

      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Sun className="size-5" /></div><div><h2 className="font-semibold">Aparência</h2><p className="text-sm text-muted-foreground">Escolha como o Melfy aparece neste dispositivo.</p></div></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {([
            { id: "light", label: "Claro", icon: Sun, desc: "Fundo suave e luminoso" },
            { id: "dark", label: "Escuro", icon: Moon, desc: "Confortável em ambientes escuros" },
            { id: "system", label: "Sistema", icon: Monitor, desc: "Segue a preferência do dispositivo" },
          ] as const).map((item) => {
            const Icon = item.icon;
            const active = theme === item.id;
            return <button key={item.id} type="button" onClick={() => changeTheme(item.id)} aria-pressed={active} className={`flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left transition-all ${active ? "border-primary bg-accent ring-1 ring-primary/30" : "border-border bg-card hover:bg-muted"}`}>
              <Icon className="mt-0.5 size-5 shrink-0" />
              <span className="min-w-0 flex-1"><span className="flex items-center gap-2 font-semibold">{item.label}{active && <Check className="size-4 text-primary" />}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.desc}</span></span>
            </button>;
          })}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">A sua subscrição</h2><p className="mt-1 text-sm text-muted-foreground">Plano e estado atual da conta.</p></div><span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">{isAdmin ? "Administrador" : subscription?.status === "suspended" ? "Suspensa" : subscription?.expires_at && subscription.expires_at.slice(0, 10) < new Date().toISOString().slice(0, 10) ? "Expirada" : subscription?.status === "active" ? "Ativa" : "A aguardar autorização"}</span></div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-muted/60 p-4">
          <div><p className="text-sm text-muted-foreground">Plano atual</p><p className="mt-1 text-xl font-bold">{isAdmin ? "Acesso total" : PLANS[plan].name}</p><p className="mt-1 text-sm text-muted-foreground">{subscription?.expires_at ? `Válido até ${dateLabel(subscription.expires_at)}` : isAdmin ? "Sem expiração" : "Aguardando confirmação de pagamento"}</p></div>
          <Button variant="outline" onClick={() => navigate({ to: "/planos" })}>Ver planos</Button>
        </div>
      </section>

      <NotificationSettings />

      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <h2 className="font-semibold">Moeda e região</h2><p className="mt-1 text-sm text-muted-foreground">Metical moçambicano (MT) · Formatação numérica portuguesa.</p>
      </section>

      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <h2 className="font-semibold">Dados de demonstração</h2><p className="mt-1 text-sm text-muted-foreground">Os registos marcados como “demo” servem apenas de exemplo. Pode apagá-los quando quiser.</p>
        <Button variant="outline" className="mt-3" disabled={clearDemo.isPending} onClick={async () => { try { await clearDemo.mutateAsync(); toast.success("Dados de demonstração apagados."); } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível apagar os dados."); } }}>Apagar dados de demonstração</Button>
      </section>

      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <h2 className="font-semibold">Sessão</h2><p className="mt-1 text-sm text-muted-foreground">Termine a sessão neste dispositivo.</p>
        <Button variant="outline" className="mt-3" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth", search: { mode: "signin", plan: undefined } }); }}>Terminar sessão</Button>
      </section>
    </div>
  );
}

function AccountForm({ initialName, initialPhone, email }: { initialName: string; initialPhone: string; email: string }) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setName(initialName); setPhone(initialPhone); }, [initialName, initialPhone]);

  async function save() {
    if (pw && pw.length < 6) { toast.error("A palavra-passe precisa de pelo menos 6 caracteres."); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ data: { display_name: name.trim(), phone: phone.trim() }, ...(pw ? { password: pw } : {}) });
      if (error) throw error;
      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").update({ display_name: name.trim() }).eq("id", data.user.id);
        if (profileError) throw profileError;
      }
      setPw("");
      toast.success(pw ? "Perfil e palavra-passe guardados." : "Perfil guardado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível guardar.");
    } finally { setBusy(false); }
  }

  return <form className="mt-5 grid gap-4 sm:max-w-xl" onSubmit={(e) => { e.preventDefault(); void save(); }}>
    <div className="grid gap-2"><Label htmlFor="profile-name">Nome completo</Label><Input id="profile-name" placeholder="O seu nome" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></div>
    <div className="grid gap-2"><Label htmlFor="profile-email">Email</Label><Input id="profile-email" value={email} readOnly disabled className="opacity-75" /><p className="text-xs text-muted-foreground">Por segurança, o email não pode ser alterado nesta área.</p></div>
    <div className="grid gap-2"><Label htmlFor="profile-phone">Número de celular</Label><Input id="profile-phone" type="tel" inputMode="tel" placeholder="+258 8X XXX XXXX" value={phone} maxLength={24} onChange={(e) => setPhone(e.target.value)} /></div>
    <div className="grid gap-2"><Label htmlFor="profile-password">Definir ou alterar palavra-passe (opcional)</Label><Input id="profile-password" type="password" placeholder="Mínimo de 6 caracteres" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /><p className="text-xs text-muted-foreground">Se entrou com Google, pode definir uma palavra-passe sem criar outra conta.</p></div>
    <div><Button type="submit" disabled={busy}>{busy ? "A guardar…" : "Guardar alterações"}</Button></div>
  </form>;
}
