import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminUsers, useIsAdmin, useUpdateSubscription, type Subscription } from "@/lib/data";
import { dateLabel, money, todayISO } from "@/lib/format";
import { PLANS, PLAN_IDS, effectivePlan, type PlanId } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/admin")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Administração — Meu Financeiro" },
      { name: "description", content: "Painel do dono: utilizadores, planos e receita." },
      { property: "og:title", content: "Administração — Meu Financeiro" },
      { property: "og:description", content: "Painel do dono: utilizadores, planos e receita." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const { data: users = [] } = useAdminUsers();
  const [search, setSearch] = useState("");
  if (isLoading) return null;
  if (!isAdmin) return <p className="p-6 text-sm text-muted-foreground">Esta área é só para o administrador.</p>;

  const today = todayISO();
  const counts: Record<PlanId, number> = { pessoal: 0, avancado: 0 };
  for (const u of users) counts[effectivePlan(u.sub, today)]++;
  const revenue = counts.pessoal * PLANS.pessoal.price + counts.avancado * PLANS.avancado.price;
  const term = search.trim().toLowerCase();
  const list = users.filter((u) => !term || (u.profile.email ?? "").toLowerCase().includes(term) || (u.profile.display_name ?? "").toLowerCase().includes(term));

  return (
    <div>
      <PageHeader title="Administração" subtitle="Painel do dono" />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Utilizadores" value={String(users.length)} />
        <Stat label="Pessoal" value={String(counts.pessoal)} />
        <Stat label="Avançado" value={String(counts.avancado)} />
        <Stat label="Receita mensal estimada" value={money(revenue)} />
      </div>
      <Input placeholder="Pesquisar por nome ou email…" className="mb-3 max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="divide-y rounded-xl border bg-card">
        {list.map((u) => (
          <UserRow key={u.profile.id} userId={u.profile.id} name={u.profile.display_name} email={u.profile.email} joined={u.profile.created_at} sub={u.sub} />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tnum mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function UserRow({ userId, name, email, joined, sub }: { userId: string; name: string | null; email: string | null; joined: string; sub: Subscription | null }) {
  const update = useUpdateSubscription();
  const [plan, setPlan] = useState(sub?.plan === "casa" ? "avancado" : (sub?.plan ?? "pessoal"));
  const [status, setStatus] = useState(sub?.status ?? "suspended");
  const [expires, setExpires] = useState(sub?.expires_at ?? "");
  const eff = effectivePlan(sub, todayISO());

  async function save(next?: { plan: string; expires: string }) {
    const p = next?.plan ?? plan;
    const e = next?.expires ?? expires;
    try {
      await update.mutateAsync({ user_id: userId, plan: p, status, expires_at: e || null });
      toast.success("Acesso actualizado com sucesso.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível actualizar.");
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{name ?? "—"}</p>
          <Badge variant="secondary">{PLANS[eff].name}</Badge>
          {sub?.status === "suspended" ? <Badge variant="destructive">Suspenso</Badge> : !sub ? <Badge variant="outline">A aguardar autorização</Badge> : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">{email} · desde {dateLabel(joined.slice(0, 10))}{sub?.expires_at ? ` · expira ${dateLabel(sub.expires_at)}` : ""}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={plan} onValueChange={setPlan}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>{PLAN_IDS.map((p) => <SelectItem key={p} value={p}>{PLANS[p].name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="active">Activo</SelectItem><SelectItem value="suspended">Suspenso</SelectItem></SelectContent>
        </Select>
        <Input type="date" className="w-[150px]" value={expires} onChange={(e) => setExpires(e.target.value)} aria-label="Válido até" />
        <Button size="sm" variant="outline" onClick={() => { const e = addDays(30); setExpires(e); void save({ plan, expires: e }); }}>+30 dias</Button>
        <Button size="sm" onClick={() => save()} disabled={update.isPending}>Guardar</Button>
      </div>
    </div>
  );
}
