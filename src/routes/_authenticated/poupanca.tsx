import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { UpgradeNotice } from "@/components/upgrade-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  accountBalances,
  useAccounts,
  useDeleteRow,
  useLoanPayments,
  usePlan,
  useSaveGoal,
  useSavingsGoals,
  useTransactions,
  type SavingsGoal,
} from "@/lib/data";
import { dateLabel, money, num, todayISO } from "@/lib/format";
import { AccountDialog } from "./contas";

export const Route = createFileRoute("/_authenticated/poupanca")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Poupança — Meu Financeiro" },
      { name: "description", content: "Metas de poupança com cofre dedicado e progresso." },
      { property: "og:title", content: "Poupança — Meu Financeiro" },
      { property: "og:description", content: "Metas de poupança com cofre dedicado e progresso." },
    ],
  }),
  component: SavingsPage,
});

const NONE = "__none__";

function SavingsPage() {
  const { can, isLoading } = usePlan();
  const { data: goals = [] } = useSavingsGoals();
  const { data: accounts = [] } = useAccounts();
  const { data: txs = [] } = useTransactions();
  const { data: payments = [] } = useLoanPayments();
  const remove = useDeleteRow("savings_goals");
  const [edit, setEdit] = useState<{ open: boolean; goal?: SavingsGoal | undefined }>({ open: false });
  const [accOpen, setAccOpen] = useState(false);
  const balances = accountBalances(accounts, txs, payments);
  const hasSavingsAccount = accounts.some((a) => a.is_savings);

  if (isLoading) return null;
  if (!can("savings")) return (<><PageHeader title="Poupança" /><UpgradeNotice plan="avancado" what="Metas de poupança com cofre" /></>);

  const saved = (g: SavingsGoal) => (g.account_id && balances.has(g.account_id) ? balances.get(g.account_id)! : num(g.saved_amount));

  return (
    <div>
      <PageHeader
        title="Poupança 🐷"
        subtitle="Junte dinheiro para os seus objectivos"
        action={<Button className="gap-2" onClick={() => setEdit({ open: true })}><Plus className="size-4" /> Nova meta</Button>}
      />

      {!hasSavingsAccount && (
        <div className="mb-5 rounded-xl border bg-card p-5">
          <p className="font-semibold">💡 Recomendação: tenha uma conta só para poupar</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Separar o dinheiro da poupança (ex.: um cofre M-Pesa ou uma conta poupança no banco) evita gastá-lo sem querer.
            Depois, transfira um valor fixo logo que receber o salário.
          </p>
          <Button className="mt-3" variant="outline" onClick={() => setAccOpen(true)}>Criar conta de poupança</Button>
        </div>
      )}

      {goals.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Ainda não tem metas. Crie a primeira, por exemplo "Fundo de emergência".</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map((g) => {
            const s = saved(g);
            const pct = Math.min(100, (s / Math.max(num(g.target_amount), 1)) * 100);
            const monthsLeft = g.target_date ? Math.max(1, Math.ceil((new Date(g.target_date).getTime() - Date.now()) / (30 * 864e5))) : null;
            const perMonth = monthsLeft ? Math.max(0, num(g.target_amount) - s) / monthsLeft : null;
            return (
              <div key={g.id} className="rounded-xl border bg-card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{g.emoji}</span>
                    <div>
                      <p className="font-semibold">{g.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {g.account_id ? `Cofre: ${accounts.find((a) => a.id === g.account_id)?.name ?? "—"}` : "Valor actualizado à mão"}
                        {g.target_date ? ` · até ${dateLabel(g.target_date)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex">
                    <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEdit({ open: true, goal: g })}><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="Eliminar" onClick={async () => { await remove.mutateAsync(g.id); toast.success("Meta eliminada."); }}><Trash2 className="size-4 text-destructive" /></Button>
                  </div>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="tnum text-xl font-bold">{money(s)}</span>
                  <span className="tnum text-sm text-muted-foreground">de {money(g.target_amount)}</span>
                </div>
                <Progress value={pct} className="mt-2" />
                <p className="mt-2 text-xs text-muted-foreground">
                  {pct >= 100 ? "🎉 Meta atingida!" : perMonth ? `Guarde cerca de ${money(Math.ceil(perMonth))} por mês para chegar lá.` : `${Math.round(pct)}% concluído`}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <GoalDialog key={`${edit.goal?.id ?? "new"}-${String(edit.open)}`} state={edit} onClose={() => setEdit({ open: false })} />
      <AccountDialog key={String(accOpen)} state={{ open: accOpen }} onClose={() => setAccOpen(false)} presetSavings />
    </div>
  );
}

function GoalDialog({ state, onClose }: { state: { open: boolean; goal?: SavingsGoal | undefined }; onClose: () => void }) {
  const save = useSaveGoal();
  const { data: accounts = [] } = useAccounts();
  const g = state.goal;
  const [name, setName] = useState(g?.name ?? "");
  const [emoji, setEmoji] = useState(g?.emoji ?? "🎯");
  const [target, setTarget] = useState(g ? String(g.target_amount) : "");
  const [savedAmt, setSavedAmt] = useState(g ? String(g.saved_amount) : "0");
  const [date, setDate] = useState(g?.target_date ?? "");
  const [accountId, setAccountId] = useState(g?.account_id ?? accounts.find((a) => a.is_savings)?.id ?? NONE);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = Number(target.replace(",", "."));
    if (!name.trim()) return toast.error("Indique o nome da meta.");
    if (!Number.isFinite(t) || t <= 0) return toast.error("Indique o valor alvo.");
    await save.mutateAsync({
      id: g?.id, name: name.trim(), emoji: emoji || "🎯", target_amount: t,
      saved_amount: Number(savedAmt.replace(",", ".")) || 0, target_date: date || null,
      account_id: accountId === NONE ? null : accountId,
    });
    toast.success("Meta guardada.");
    onClose();
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{g ? "Editar meta" : "Nova meta de poupança"}</DialogTitle>
          <DialogDescription>Associe a um cofre para o progresso ser automático.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-[64px_1fr] gap-3">
            <div className="space-y-1.5"><Label htmlFor="g-emoji">Ícone</Label><Input id="g-emoji" value={emoji} maxLength={4} className="text-center text-xl" onChange={(e) => setEmoji(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="g-name">Nome</Label><Input id="g-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Fundo de emergência" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="g-target">Valor alvo (MT)</Label><Input id="g-target" inputMode="decimal" className="tnum" value={target} onChange={(e) => setTarget(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="g-date">Até</Label><Input id="g-date" type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Cofre (conta de poupança)</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem cofre — actualizar à mão</SelectItem>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.is_savings ? "🐷 " : ""}{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {accountId === NONE && (
            <div className="space-y-1.5"><Label htmlFor="g-saved">Já guardado (MT)</Label><Input id="g-saved" inputMode="decimal" className="tnum" value={savedAmt} onChange={(e) => setSavedAmt(e.target.value)} /></div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
