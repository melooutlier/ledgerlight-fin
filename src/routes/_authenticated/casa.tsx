import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { UpgradeNotice } from "@/components/upgrade-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCategories, useDeleteRow, useHouseholdBills, usePlan, useSaveBill, useSaveTransaction, type HouseholdBill } from "@/lib/data";
import { money, num, todayISO } from "@/lib/format";
import { monthStartISO } from "@/lib/period";

export const Route = createFileRoute("/_authenticated/casa")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Casa — Meu Financeiro" },
      { name: "description", content: "Contas fixas da casa: energia, água, renda e mais." },
      { property: "og:title", content: "Casa — Meu Financeiro" },
      { property: "og:description", content: "Contas fixas da casa: energia, água, renda e mais." },
    ],
  }),
  component: HousePage,
});

function HousePage() {
  const { can, isLoading } = usePlan();
  const { data: bills = [] } = useHouseholdBills();
  const { data: categories = [] } = useCategories();
  const saveBill = useSaveBill();
  const saveTx = useSaveTransaction();
  const remove = useDeleteRow("household_bills");
  const [edit, setEdit] = useState<{ open: boolean; bill?: HouseholdBill | undefined }>({ open: false });
  const month = monthStartISO();
  const day = new Date().getDate();

  if (isLoading) return null;
  if (!can("household")) return (<><PageHeader title="Casa" /><UpgradeNotice plan="casa" what="Gestão das contas fixas da casa" /></>);

  const total = bills.reduce((s, b) => s + num(b.amount), 0);
  const paid = bills.filter((b) => b.last_paid_month === month).reduce((s, b) => s + num(b.amount), 0);

  async function markPaid(b: HouseholdBill) {
    const cat = categories.find((c) => c.kind === "expense" && c.name === "Casa");
    await saveTx.mutateAsync({
      type: "expense", description: b.name, amount: num(b.amount), tx_date: todayISO(),
      category_id: cat?.id ?? null, method: null, notes: b.member ? `Pago por ${b.member}` : null,
    });
    await saveBill.mutateAsync({ id: b.id, name: b.name, emoji: b.emoji, amount: num(b.amount), due_day: b.due_day, member: b.member, last_paid_month: month });
    toast.success(`${b.emoji} ${b.name} paga e registada como despesa.`);
  }

  return (
    <div>
      <PageHeader
        title="Casa 🏠"
        subtitle={`Pago este mês: ${money(paid)} de ${money(total)}`}
        action={<Button className="gap-2" onClick={() => setEdit({ open: true })}><Plus className="size-4" /> Conta fixa</Button>}
      />
      {bills.length === 0 && (
        <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          Adicione as contas da casa: energia (Credelec), água (FIPAG), renda, internet, empregada, gás…
        </p>
      )}
      <div className="divide-y rounded-xl border bg-card">
        {[...bills].sort((a, b) => a.due_day - b.due_day).map((b) => {
          const isPaid = b.last_paid_month === month;
          const late = !isPaid && day > b.due_day;
          const soon = !isPaid && !late && b.due_day - day <= 3;
          return (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-muted text-xl">{b.emoji}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{b.name}</p>
                    {isPaid ? <Badge variant="secondary">✅ Pago</Badge> : late ? <Badge variant="destructive">Atrasado</Badge> : soon ? <Badge variant="outline">Vence em breve</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">Dia {b.due_day}{b.member ? ` · ${b.member}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="tnum font-semibold">{money(b.amount)}</span>
                {!isPaid && <Button size="sm" onClick={() => markPaid(b)}>Marcar pago</Button>}
                <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEdit({ open: true, bill: b })}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon" aria-label="Eliminar" onClick={async () => { await remove.mutateAsync(b.id); toast.success("Conta removida."); }}><Trash2 className="size-4 text-destructive" /></Button>
              </div>
            </div>
          );
        })}
      </div>
      <BillDialog key={`${edit.bill?.id ?? "new"}-${String(edit.open)}`} state={edit} onClose={() => setEdit({ open: false })} />
    </div>
  );
}

function BillDialog({ state, onClose }: { state: { open: boolean; bill?: HouseholdBill | undefined }; onClose: () => void }) {
  const save = useSaveBill();
  const b = state.bill;
  const [name, setName] = useState(b?.name ?? "");
  const [emoji, setEmoji] = useState(b?.emoji ?? "🏠");
  const [amount, setAmount] = useState(b ? String(b.amount) : "");
  const [dueDay, setDueDay] = useState(String(b?.due_day ?? 5));
  const [member, setMember] = useState(b?.member ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(amount.replace(",", "."));
    const d = Math.min(31, Math.max(1, Number(dueDay) || 1));
    if (!name.trim()) return toast.error("Indique o nome.");
    if (!Number.isFinite(v) || v <= 0) return toast.error("Indique um valor válido.");
    await save.mutateAsync({ id: b?.id, name: name.trim(), emoji: emoji || "🏠", amount: v, due_day: d, member: member.trim() || null });
    toast.success("Conta guardada.");
    onClose();
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{b ? "Editar conta fixa" : "Nova conta fixa"}</DialogTitle>
          <DialogDescription>Despesa que se repete todos os meses.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-[64px_1fr] gap-3">
            <div className="space-y-1.5"><Label htmlFor="b-emoji">Ícone</Label><Input id="b-emoji" value={emoji} maxLength={4} className="text-center text-xl" onChange={(e) => setEmoji(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="b-name">Nome</Label><Input id="b-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Energia (Credelec)" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="b-amount">Valor (MT)</Label><Input id="b-amount" inputMode="decimal" className="tnum" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="b-day">Dia de vencimento</Label><Input id="b-day" inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="b-member">Quem paga (opcional)</Label><Input id="b-member" value={member} maxLength={40} onChange={(e) => setMember(e.target.value)} placeholder="Ex.: Mãe, João" /></div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
