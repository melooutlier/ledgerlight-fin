import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
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
import { useAdvances, useCategories, useLoanPayments, useLoans, useTransactions } from "@/lib/data";
import { dateLabel, money, num } from "@/lib/format";
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

type Kind = "income" | "expense" | "loan" | "loan_payment" | "advance";

const KIND_LABEL: Record<Kind, string> = {
  income: "Entrada",
  expense: "Despesa",
  loan: "Empréstimo",
  loan_payment: "Pagamento de empréstimo",
  advance: "Adiantamento",
};

function MovementsPage() {
  const [key, setKey] = useState<PeriodKey>("this_month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kind, setKind] = useState<"all" | Kind>("all");
  const [search, setSearch] = useState("");
  const period = useMemo(() => buildPeriod(key, from, to), [key, from, to]);

  const { data: transactions = [] } = useTransactions();
  const { data: loans = [] } = useLoans();
  const { data: payments = [] } = useLoanPayments();
  const { data: advances = [] } = useAdvances();
  const { data: categories = [] } = useCategories();

  const items = useMemo(() => {
    const list: { id: string; date: string; kind: Kind; title: string; sub: string; amount: number; demo: boolean }[] = [];
    for (const t of transactions) {
      list.push({
        id: `t-${t.id}`,
        date: t.tx_date,
        kind: t.type as Kind,
        title: t.description,
        sub: [categories.find((c) => c.id === t.category_id)?.name, t.method].filter(Boolean).join(" · "),
        amount: num(t.amount),
        demo: t.is_demo,
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
        demo: l.is_demo,
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
        demo: p.is_demo,
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
        demo: a.is_demo,
      });
    }
    return list.sort((x, y) => (x.date < y.date ? 1 : -1));
  }, [transactions, loans, payments, advances, categories]);

  const filtered = items.filter(
    (i) =>
      inPeriod(i.date, period) &&
      (kind === "all" || i.kind === kind) &&
      (search.trim() === "" || i.title.toLowerCase().includes(search.trim().toLowerCase())),
  );

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
        <Input
          placeholder="Pesquisar…"
          className="w-[200px]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="divide-y rounded-xl border bg-card">
        {filtered.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Sem movimentações neste período.
          </p>
        )}
        {filtered.map((i) => (
          <div key={i.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium">{i.title}</p>
                <Badge variant="secondary">{KIND_LABEL[i.kind]}</Badge>
                {i.demo && <Badge variant="outline">demo</Badge>}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {dateLabel(i.date)}
                {i.sub ? ` · ${i.sub}` : ""}
              </p>
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
              {money(i.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
