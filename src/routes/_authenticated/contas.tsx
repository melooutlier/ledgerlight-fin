import { UpgradeButton } from "@/components/upgrade-notice";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ACCOUNT_TYPES,
  accountBalances,
  useAccounts,
  useDeleteRow,
  useLoanPayments,
  usePlan,
  useSaveAccount,
  useTransactions,
  useTransfer,
  type Account,
} from "@/lib/data";
import { money, todayISO } from "@/lib/format";
import { fmtMoney, usePrivacy } from "@/lib/privacy";

export const Route = createFileRoute("/_authenticated/contas")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Contas e carteiras — Meu Financeiro" },
      { name: "description", content: "Saldos de M-Pesa, e-Mola, bancos e dinheiro em mão." },
      { property: "og:title", content: "Contas e carteiras — Meu Financeiro" },
      { property: "og:description", content: "Saldos de M-Pesa, e-Mola, bancos e dinheiro em mão." },
    ],
  }),
  component: AccountsPage,
});

function AccountsPage() {
  const hidden = usePrivacy();
  const { data: accounts = [] } = useAccounts();
  const { data: txs = [] } = useTransactions();
  const { data: payments = [] } = useLoanPayments();
  const { can, accountLimit } = usePlan();
  const remove = useDeleteRow("accounts");
  const [edit, setEdit] = useState<{ open: boolean; account?: Account | undefined }>({ open: false });
  const [transferOpen, setTransferOpen] = useState(false);
  const balances = accountBalances(accounts, txs, payments);
  const total = [...balances.values()].reduce((s, v) => s + v, 0);
  const atLimit = accounts.length >= accountLimit;

  return (
    <div>
      <PageHeader
        title="Contas e carteiras"
        subtitle={`Total em todas as contas: ${fmtMoney(total, hidden)}`}
        action={
          <div className="flex gap-2">
            {can("transfers") && accounts.length > 1 && (
              <Button variant="outline" className="gap-2" onClick={() => setTransferOpen(true)}>
                <ArrowLeftRight className="size-4" /> Transferir
              </Button>
            )}
            <Button
              className="gap-2"
              onClick={() => (atLimit ? toast.info("O plano Pessoal permite 1 conta. Veja os planos para mais.") : setEdit({ open: true }))}
            >
              <Plus className="size-4" /> Nova conta
            </Button>
          </div>
        }
      />

      {atLimit && !can("multi_accounts") && (
        <p className="mb-4 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          🔒 Tem M-Pesa, e-Mola e banco? O plano Pessoal Avançado permite contas ilimitadas e transferências.{" "}<UpgradeButton size="sm" variant="outline" className="ml-2">Fazer upgrade</UpgradeButton>
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => (
          <div key={a.id} className="rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-muted text-xl">
                  {a.is_savings ? "🐷" : (ACCOUNT_TYPES[a.type]?.emoji ?? "👛")}
                </span>
                <div>
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ACCOUNT_TYPES[a.type]?.label ?? a.type}
                    {a.is_savings ? " · Poupança" : ""}
                  </p>
                </div>
              </div>
              <div className="flex">
                <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEdit({ open: true, account: a })}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Eliminar"
                  onClick={async () => {
                    if (!confirm(`Eliminar a conta "${a.name}"? As movimentações ficam sem conta.`)) return;
                    await remove.mutateAsync(a.id);
                    toast.success("Conta eliminada.");
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
            <p className="tnum mt-4 text-2xl font-bold">{fmtMoney(balances.get(a.id) ?? 0, hidden)}</p>
          </div>
        ))}
      </div>

      <AccountDialog key={`${edit.account?.id ?? "new"}-${String(edit.open)}`} state={edit} onClose={() => setEdit({ open: false })} />
      <TransferDialog key={String(transferOpen)} open={transferOpen} onClose={() => setTransferOpen(false)} accounts={accounts} />
    </div>
  );
}

export function AccountDialog({
  state,
  onClose,
  presetSavings = false,
}: {
  state: { open: boolean; account?: Account | undefined };
  onClose: () => void;
  presetSavings?: boolean;
}) {
  const save = useSaveAccount();
  const a = state.account;
  const [name, setName] = useState(a?.name ?? (presetSavings ? "Cofre de poupança" : ""));
  const [type, setType] = useState(a?.type ?? "mpesa");
  const [initial, setInitial] = useState(a ? String(a.initial_balance) : "0");
  const [isSavings, setIsSavings] = useState(a?.is_savings ?? presetSavings);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Indique o nome da conta."); return; }
    try {
      await save.mutateAsync({ id: a?.id, name: name.trim(), type, initial_balance: Number(initial.replace(",", ".")) || 0, is_savings: isSavings });
      toast.success("Conta guardada.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível guardar.");
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{a ? "Editar conta" : "Nova conta"}</DialogTitle>
          <DialogDescription>M-Pesa, e-Mola, banco ou dinheiro em mão.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="acc-name">Nome</Label>
            <Input id="acc-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Ex.: M-Pesa pessoal, BCI" />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ACCOUNT_TYPES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-initial">Saldo inicial (MT)</Label>
            <Input id="acc-initial" inputMode="decimal" className="tnum" value={initial} onChange={(e) => setInitial(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <span className="text-sm">🐷 Conta de poupança</span>
            <Switch checked={isSavings} onCheckedChange={setIsSavings} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({ open, onClose, accounts }: { open: boolean; onClose: () => void; accounts: Account[] }) {
  const transfer = useTransfer();
  const [from, setFrom] = useState(accounts[0]?.id ?? "");
  const [to, setTo] = useState(accounts[1]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(amount.replace(",", "."));
    if (!from || !to || from === to) { toast.error("Escolha duas contas diferentes."); return; }
    if (!Number.isFinite(v) || v <= 0) { toast.error("Indique um valor válido."); return; }
    const n = (id: string) => accounts.find((a) => a.id === id)?.name ?? "";
    try {
      await transfer.mutateAsync({ from, to, amount: v, date, description: `Transferência ${n(from)} → ${n(to)}` });
      toast.success("Transferência registada.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível transferir.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Transferir entre contas</DialogTitle>
          <DialogDescription>Não conta como entrada nem como despesa.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {[["De", from, setFrom], ["Para", to, setTo]].map(([label, val, set]) => (
            <div key={label as string} className="space-y-1.5">
              <Label>{label as string}</Label>
              <Select value={val as string} onValueChange={set as (v: string) => void}>
                <SelectTrigger><SelectValue placeholder="Conta" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{ACCOUNT_TYPES[a.type]?.emoji} {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tr-amount">Valor (MT)</Label>
              <Input id="tr-amount" inputMode="decimal" className="tnum" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tr-date">Data</Label>
              <Input id="tr-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={transfer.isPending}>Transferir</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
