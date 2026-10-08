import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { PeriodPicker } from "@/components/period-picker";
import { useMovements } from "@/components/movements";
import { useAccounts, useCategories, useDeleteRow, useSaveTransaction, useTransactions, type Transaction } from "@/lib/data";
import { emojiFor } from "@/lib/emoji";
import { ReceiptButton } from "@/components/receipt-button";
import { buildPeriod, inPeriod, type PeriodKey } from "@/lib/period";
import { dateLabel, money, num, todayISO } from "@/lib/format";

const ALL = "__all__";

export function TransactionsView({ type }: { type: "income" | "expense" }) {
  const { data: transactions = [], isLoading } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { openTransaction } = useMovements();
  const remove = useDeleteRow("transactions");
  const save = useSaveTransaction();
  const { data: accounts = [] } = useAccounts();
  const accName = (id: string | null) => accounts.find((a) => a.id === id)?.name;
  async function confirm(t: Transaction) {
    await save.mutateAsync({
      id: t.id, type: t.type as "income" | "expense", description: t.description, amount: Number(t.amount),
      tx_date: t.tx_date, category_id: t.category_id, method: t.method, notes: t.notes, confirmed: true,
    });
    toast.success(t.type === "expense" ? "Pagamento confirmado." : "Recebimento confirmado.");
  }

  const [periodKey, setPeriodKey] = useState<PeriodKey>("this_month");
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(ALL);
  const [sort, setSort] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">(
    "date_desc",
  );

  const period = buildPeriod(periodKey, from, to);
  const catName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name] as const)),
    [categories],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = transactions.filter(
      (t) =>
        t.type === type &&
        inPeriod(t.tx_date, period) &&
        (categoryId === ALL || t.category_id === categoryId) &&
        (!term ||
          t.description.toLowerCase().includes(term) ||
          (catName.get(t.category_id ?? "") ?? "").toLowerCase().includes(term)),
    );
    return [...list].sort((a, b) => {
      if (sort === "amount_desc") return num(b.amount) - num(a.amount);
      if (sort === "amount_asc") return num(a.amount) - num(b.amount);
      if (sort === "date_asc") return a.tx_date.localeCompare(b.tx_date);
      return b.tx_date.localeCompare(a.tx_date);
    });
  }, [transactions, type, period, categoryId, search, sort, catName]);

  const total = rows.reduce((s, t) => s + num(t.amount), 0);
  const isExpense = type === "expense";

  return (
    <>
      <PageHeader
        title={isExpense ? "Despesas" : "Entradas"}
        subtitle={period.label}
        action={
          <Button onClick={() => openTransaction(type)} className="gap-2">
            <Plus className="size-4" />
            {isExpense ? "Adicionar despesa" : "Adicionar entrada"}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <PeriodPicker
          value={periodKey}
          onChange={setPeriodKey}
          from={from}
          to={to}
          onFrom={setFrom}
          onTo={setTo}
        />
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar…"
            className="pl-9"
          />
        </div>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as categorias</SelectItem>
            {categories
              .filter((c) => c.kind === type)
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">Mais recentes</SelectItem>
            <SelectItem value="date_asc">Mais antigas</SelectItem>
            <SelectItem value="amount_desc">Maior valor</SelectItem>
            <SelectItem value="amount_asc">Menor valor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-3 flex items-baseline justify-between rounded-xl border bg-card px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "registo" : "registos"}
        </span>
        <span className="tnum text-lg font-bold">{money(total)}</span>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="hidden grid-cols-[100px_1fr_130px_120px_120px_120px] gap-3 border-b px-4 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:grid">
          <span>Data</span>
          <span>Descrição</span>
          <span>Categoria</span>
          <span>Conta</span>
          <span className="text-right">Valor</span>
          <span className="text-right">Acções</span>
        </div>
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">A carregar…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Sem registos neste período. Use o botão acima para adicionar.
          </p>
        ) : (
          rows.map((t) => (
            <div
              key={t.id}
              className="grid grid-cols-2 items-center gap-2 border-b px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[100px_1fr_130px_120px_120px_120px] sm:gap-3"
            >
              <span className="tnum text-muted-foreground">{dateLabel(t.tx_date)}</span>
              <span className="order-first col-span-2 flex items-center gap-2 font-medium sm:order-none sm:col-span-1">
                <span className="text-lg" aria-hidden>{emojiFor(t.description, catName.get(t.category_id ?? ""), t.type)}</span>
                {t.description}
                {!t.confirmed && (
                  <button
                    type="button"
                    onClick={() => confirm(t)}
                    className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] text-foreground underline-offset-2 hover:underline"
                  >
                    {isExpense ? "por pagar · confirmar" : "por receber · confirmar"}
                  </button>
                )}
                {t.is_demo && (
                  <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    demo
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">{catName.get(t.category_id ?? "") ?? "—"}</span>
              <span className="text-muted-foreground">{accName(t.account_id) ?? t.method ?? "—"}</span>
              <span
                className={`tnum text-right font-semibold ${isExpense ? "" : "text-positive"}`}
              >
                {isExpense ? "-" : "+"}
                {money(t.amount)}
              </span>
              <span className="flex justify-end gap-1">
                <ReceiptButton path={t.image_path} />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Editar"
                  onClick={() => openTransaction(type, t)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Eliminar"
                  onClick={async () => {
                    await remove.mutateAsync(t.id);
                    toast.success("Registo eliminado.");
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
