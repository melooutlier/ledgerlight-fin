import { UpgradeButton } from "@/components/upgrade-notice";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Building2, Check, ChevronDown, CreditCard, Pencil, Plus, Search, Smartphone, Trash2, Wallet } from "lucide-react";
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

const ACCOUNT_KIND_OPTIONS = [
  { id: "corrente", label: "Conta corrente" },
  { id: "poupanca", label: "Conta poupança" },
  { id: "carteira_movel", label: "Carteira móvel" },
  { id: "cartao", label: "Cartão" },
  { id: "dinheiro", label: "Dinheiro em mão" },
  { id: "outro", label: "Outra" },
] as const;


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
                <InstitutionMark institution={a.institution ?? a.type} />
                <div>
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(ACCOUNT_KIND_OPTIONS.find((option) => option.id === a.type)?.label ?? ACCOUNT_TYPES[a.type]?.label ?? a.type)}
                    {a.is_savings ? " · Poupança" : ""}
                    {a.account_number ? <span className="mt-0.5 block text-xs text-muted-foreground">•••• {a.account_number.slice(-4)}</span> : null}
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
            <div className="mt-4 flex items-end justify-between gap-2"><p className="tnum text-2xl font-bold">{fmtMoney(balances.get(a.id) ?? 0, hidden)}</p><span className="mb-1 size-2.5 rounded-full" style={{ backgroundColor: a.account_color ?? "#166534" }} /></div>
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
  const [type, setType] = useState(a?.type ?? "carteira_movel");
  const [initial, setInitial] = useState(a ? String(a.initial_balance) : "0");
  const [isSavings, setIsSavings] = useState(a?.is_savings ?? presetSavings);
  const [institution, setInstitution] = useState(a?.institution ?? (a?.type === "emola" ? "emola" : a?.type === "mkesh" ? "mkesh" : a?.type === "dinheiro" ? "cash" : a?.type === "banco" ? "other" : "mpesa"));
  const [accountNumber, setAccountNumber] = useState(a?.account_number ?? "");
  const [color, setColor] = useState(a?.account_color ?? "#e31b36");
  const [icon, setIcon] = useState(a?.account_icon ?? "wallet");
  const [query, setQuery] = useState("");
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const selected = MOZAMBIQUE_INSTITUTIONS.find((bank) => bank.id === institution) ?? MOZAMBIQUE_INSTITUTIONS[12];
  const matches = MOZAMBIQUE_INSTITUTIONS.filter((bank) => (bank.name + " " + bank.provider).toLocaleLowerCase("pt").includes(query.toLocaleLowerCase("pt")));

  function chooseInstitution(id: string) {
    const bank = MOZAMBIQUE_INSTITUTIONS.find((item) => item.id === id) ?? MOZAMBIQUE_INSTITUTIONS[12];
    setInstitution(bank.id);
    setColor(bank.color);
    if (!name.trim() || MOZAMBIQUE_INSTITUTIONS.some((item) => item.name === name)) setName(bank.name);
    if (bank.kind === "mobile") setType("carteira_movel");
    else if (bank.kind === "cash") setType("dinheiro");
    else if (bank.kind === "bank") setType("corrente");
    setBankPickerOpen(false);
    setQuery("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Indique o nome da conta."); return; }
    try {
      await save.mutateAsync({
        id: a?.id, name: name.trim(), type,
        initial_balance: Number(initial.replace(/\s/g, "").replace(",", ".")) || 0,
        is_savings: isSavings, institution, account_number: accountNumber.trim() || null,
        account_color: color, account_icon: icon,
      });
      toast.success("Conta guardada.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível guardar.");
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{a ? "Editar conta" : "Adicionar conta ou carteira"}</DialogTitle>
          <DialogDescription>Organize os seus bancos, carteiras móveis e cartões num só lugar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Banco ou instituição financeira</Label>
            <button type="button" onClick={() => setBankPickerOpen((open) => !open)} className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-input bg-background p-3 text-left hover:bg-muted/50">
              <InstitutionMark institution={institution} />
              <span className="min-w-0 flex-1"><span className="block font-semibold">{selected.name}</span><span className="block text-xs text-muted-foreground">{selected.provider}</span></span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
            {bankPickerOpen && <div className="rounded-2xl border bg-card p-3 shadow-lg">
              <div className="relative mb-2"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Digite o nome do banco" className="pl-9" /></div>
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {matches.map((bank) => <button key={bank.id} type="button" onClick={() => chooseInstitution(bank.id)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-muted">
                  <InstitutionMark institution={bank.id} size="sm" /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{bank.name}</span><span className="block text-xs text-muted-foreground">{bank.provider}</span></span>{institution === bank.id && <Check className="size-4 text-primary" />}
                </button>)}
                {matches.length === 0 && <p className="px-2 py-4 text-center text-sm text-muted-foreground">Nenhuma instituição encontrada.</p>}
              </div>
            </div>}
          </div>
          <div className="space-y-1.5"><Label htmlFor="acc-name">Nome da conta</Label><Input id="acc-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Ex.: M-Pesa pessoal, BCI salário" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Tipo de conta</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger><SelectContent>{ACCOUNT_KIND_OPTIONS.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label htmlFor="acc-initial">Saldo inicial (MT)</Label><Input id="acc-initial" inputMode="decimal" className="tnum" value={initial} onChange={(e) => setInitial(e.target.value)} placeholder="0,00" /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="acc-number">NIB / número de conta (opcional)</Label><Input id="acc-number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Digite o NIB ou número de conta" maxLength={50} autoComplete="off" /><p className="text-xs text-muted-foreground">O número completo não aparece nos cartões da lista.</p></div>
          <div className="space-y-2 rounded-2xl border p-3">
            <Label>Cor e ícone da conta</Label>
            <div className="flex flex-wrap items-center gap-2">
              {["#e31b36", "#f5a623", "#f5c928", "#bd1744", "#d97927", "#0875bd", "#16844a", "#1768a9", "#00a5a8", "#166534", "#68756a"].map((swatch) => <button key={swatch} type="button" aria-label={"Selecionar cor " + swatch} onClick={() => setColor(swatch)} className={"size-8 rounded-full border-2 " + (color === swatch ? "border-foreground ring-2 ring-primary/40 ring-offset-2" : "border-transparent")} style={{ backgroundColor: swatch }} />)}
              <input aria-label="Cor personalizada" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="size-9 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
            </div>
            <div className="flex gap-2">
              {[{ id: "wallet", label: "Carteira", Icon: Wallet }, { id: "bank", label: "Banco", Icon: Building2 }, { id: "mobile", label: "Móvel", Icon: Smartphone }, { id: "card", label: "Cartão", Icon: CreditCard }].map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => setIcon(id)} aria-pressed={icon === id} className={"flex flex-1 flex-col items-center gap-1 rounded-xl border p-2 text-xs " + (icon === id ? "border-primary bg-accent text-accent-foreground" : "border-border hover:bg-muted")}><Icon className="size-4" />{label}</button>)}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border px-3 py-3"><span className="text-sm">🐷 Conta de poupança</span><Switch checked={isSavings} onCheckedChange={setIsSavings} /></div>
          <DialogFooter><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? "A guardar…" : "Guardar conta"}</Button></DialogFooter>
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
