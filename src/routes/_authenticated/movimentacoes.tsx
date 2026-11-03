import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useMovements } from "@/components/movements";
import { PeriodPicker } from "@/components/period-picker";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts, useAdvances, useCategories, useLoanPayments, useLoans, useTransactions } from "@/lib/data";
import { emojiFor } from "@/lib/emoji";
import { dateLabel, money, num } from "@/lib/format";
import { fmtMoney, usePrivacy } from "@/lib/privacy";
import { buildPeriod, inPeriod, type PeriodKey } from "@/lib/period";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/movimentacoes")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Movimentações — Meu Financeiro" },
      { name: "description", content: "Histórico completo de entradas, despesas, empréstimos e adiantamentos." },
      { property: "og:title", content: "Movimentações — Meu Financeiro" },
      {
        property: "og:description",
        content: "Histórico completo de entradas, despesas, empréstimos e adiantamentos.",
      },
    ],
  }),
  component: MovementsPage,
});

type Kind = "income" | "expense" | "loan" | "loan_payment" | "advance" | "transfer";

const KIND_LABEL: Record<Kind, string> = {
  income: "Entrada",
  expense: "Despesa",
  loan: "Empréstimo",
  loan_payment: "Pagamento de empréstimo",
  advance: "Adiantamento",
  transfer: "Transferência",
};

function MovementsPage() {
  const hidden = usePrivacy();
  const { openTransaction } = useMovements();
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "1") {
      openTransaction("expense");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [openTransaction]);
  const [key, setKey] = useState<PeriodKey>("this_month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kind, setKind] = useState<"all" | Kind>("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [search, setSearch] = useState("");
  const period = useMemo(() => buildPeriod(key, from, to), [key, from, to]);

  const { data: transactions = [] } = useTransactions();
  const { data: loans = [] } = useLoans();
  const { data: payments = [] } = useLoanPayments();
  const { data: advances = [] } = useAdvances();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const accName = (id: string | null) => accounts.find((a) => a.id === id)?.name;

  const items = useMemo(() => {
    const list: { id: string; date: string; kind: Kind; title: string; sub: string; amount: number; demo: boolean; emoji: string; accountId: string | null; pending?: boolean }[] = [];
    for (const t of transactions) {
      if (t.type === "transfer_in") continue;
      const isTransfer = t.type === "transfer_out";
      const to = isTransfer ? transactions.find((x) => x.transfer_group === t.transfer_group && x.id !== t.id) : undefined;
      const catName = categories.find((c) => c.id === t.category_id)?.name;
      list.push({
        id: `t-${t.id}`,
        date: t.tx_date,
        kind: isTransfer ? "transfer" : (t.type as Kind),
        title: t.description,
        sub: isTransfer
          ? `${accName(t.account_id) ?? "?"} → ${accName(to?.account_id ?? null) ?? "?"}`
          : [catName, accName(t.account_id) ?? t.method].filter(Boolean).join(" · "),
        amount: num(t.amount),
        accountId: t.account_id,
        demo: t.is_demo,
        emoji: isTransfer ? "🔁" : emojiFor(t.description, catName, t.type),
        pending: !t.confirmed,
      });
    }
    for (const l of loans) {
      list.push({
        id: `l-${l.id}`,
        date: l.loan_date,
        kind: "loan",
        title: `Emprestado a ${l.person_name}`,
        sub: l.reason ?? "",
        amount: num(l.amount),
        accountId: null,
        demo: l.is_demo,
        emoji: "🤝",
      });
    }
    for (const p of payments) {
      const loan = loans.find((l) => l.id === p.loan_id);
      list.push({
        id: `p-${p.id}`,
        date: p.paid_at,
        kind: "loan_payment",
        title: `Pagamento de ${loan?.person_name ?? "empréstimo"}`,
        sub: p.notes ?? "",
        amount: num(p.amount),
        accountId: p.account_id,
        demo: p.is_demo,
        emoji: "✅",
      });
    }
    for (const a of advances) {
      list.push({
        id: `a-${a.id}`,
        date: a.advance_date,
        kind: "advance",
        title: a.purpose,
        sub: a.notes ?? "",
        amount: num(a.amount),
        accountId: null,
        demo: a.is_demo,
        emoji: "🧾",
      });
    }
    return list.sort((x, y) => (x.date < y.date ? 1 : -1));
  }, [transactions, loans, payments, advances, categories, accounts]);

  const filtered = items.filter(
    (i) =>
      inPeriod(i.date, period) &&
      (kind === "all" || i.kind === kind) &&
      (accountFilter === "all" || (accountFilter === "none" ? i.accountId === null : i.accountId === accountFilter)) &&
      (search.trim() === "" || i.title.toLowerCase().includes(search.trim().toLowerCase())),
  );

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const i of filtered) {
      const rows = map.get(i.date);
      if (rows) rows.push(i);
      else map.set(i.date, [i]);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div>
      <PageHeader title="Movimentações" subtitle={period.label} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <PeriodPicker value={key} onChange={setKey} from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <Select value={kind} onValueChange={(v) => setKind(v as "all" | Kind)}>
          <SelectTrigger className="w-[210px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
              <SelectItem key={k} value={k}>
                {KIND_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="w-[210px]">
            <SelectValue placeholder="Todas as contas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
            ))}
            <SelectItem value="none">Sem conta associada</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Pesquisar…"
          className="w-[200px]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 && (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          Sem movimentações neste período.
        </p>
      )}

      {groups.map(([date, rows]) => (
        <div key={date} className="mb-4">
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {dateLabel(date)}
          </p>
          <div className="divide-y rounded-xl border bg-card">
            {rows.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xl">{i.emoji}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{i.title}</p>
                      <Badge variant="secondary">{KIND_LABEL[i.kind]}</Badge>
                      {i.demo && <Badge variant="outline">demo</Badge>}
                      {i.pending && <Badge variant="outline">por confirmar</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {i.sub ? i.sub : dateLabel(i.date)}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "tnum shrink-0 font-semibold",
                    i.kind === "income" || i.kind === "loan_payment"
                      ? "text-positive"
                      : i.kind === "expense"
                        ? "text-destructive"
                        : "text-foreground",
                  )}
                >
                  {fmtMoney(i.amount, hidden)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
