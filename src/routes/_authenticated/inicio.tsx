import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, HandCoins, Maximize2, Plus, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/app-shell";
import { useMovements } from "@/components/movements";
import { buildAlerts } from "@/lib/alerts";
import {
  accountBalances,
  loanSummary,
  useAccounts,
  useBudgetCategories,
  useBudgets,
  useCategories,
  useCurrentUser,
  useLoanPayments,
  useLoans,
  useTransactions,
} from "@/lib/data";
import { money, monthLabel, num } from "@/lib/format";
import { emojiFor } from "@/lib/emoji";
import { fmtMoney, usePrivacy } from "@/lib/privacy";
import { inPeriod, type Period } from "@/lib/period";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/inicio")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Início — Melfy" },
      { name: "description", content: "Veja o seu saldo, receitas, despesas e valores a receber." },
      { property: "og:title", content: "Início — Melfy" },
      { property: "og:description", content: "Veja o seu saldo, receitas, despesas e valores a receber." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const DONUT_PALETTE = ["#84cc16", "#4b9e68", "#e5ad38", "#79a9d8", "#dd7777"];

function monthPeriod(offset: number): Period {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { key: "this_month", from: iso(start), to: iso(end), label: monthLabel(iso(start)) };
}

function Dashboard() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [activityDays, setActivityDays] = useState("7");
  const period = useMemo(() => monthPeriod(monthOffset), [monthOffset]);
  const hidden = usePrivacy();
  const { openTransaction } = useMovements();

  const { data: user } = useCurrentUser();
  const { data: transactions = [] } = useTransactions();
  const { data: loans = [] } = useLoans();
  const { data: payments = [] } = useLoanPayments();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { data: budgets = [] } = useBudgets();
  const { data: budgetCategories = [] } = useBudgetCategories();

  const metadata = user?.user_metadata ?? {};
  const name = ((metadata["display_name"] as string | undefined) ?? (metadata["full_name"] as string | undefined) ?? user?.email?.split("@")[0] ?? "") as string;

  const confirmed = transactions.filter((t) => t.confirmed !== false);
  const balances = useMemo(() => accountBalances(accounts, transactions, payments), [accounts, transactions, payments]);
  const totalAccounts = accounts.reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);

  const inRange = confirmed.filter((t) => inPeriod(t.tx_date, period));
  const income = inRange.filter((t) => t.type === "income").reduce((s, t) => s + num(t.amount), 0);
  const expense = inRange.filter((t) => t.type === "expense").reduce((s, t) => s + num(t.amount), 0);
  const result = income - expense;

  const balance = totalAccounts;
  const receivable = loans.reduce((s, l) => s + loanSummary(l, payments).pending, 0);
  const forecast = totalAccounts + receivable;

  const resultPercent = income > 0 ? Math.max(0, Math.min(100, Math.round((result / income) * 100))) : 0;

  const pendingLoans = loans
    .map((loan) => ({ loan, summary: loanSummary(loan, payments) }))
    .filter((entry) => entry.summary.pending > 0)
    .sort((a, b) => b.summary.pending - a.summary.pending);

  function categorySlices(kind: "expense" | "income") {
    const rows = inRange.filter((t) => t.type === kind);
    const total = rows.reduce((s, t) => s + num(t.amount), 0);
    const byCategory = new Map<string, number>();
    for (const t of rows) {
      const key = t.category_id ?? "sem";
      byCategory.set(key, (byCategory.get(key) ?? 0) + num(t.amount));
    }
    const slices = [...byCategory.entries()]
      .map(([id, value]) => ({
        name: categories.find((c) => c.id === id)?.name ?? "Sem categoria",
        value,
      }))
      .sort((a, b) => b.value - a.value);
    return { total, slices };
  }
  const expenseDonut = useMemo(() => categorySlices("expense"), [inRange, categories]);
  const incomeDonut = useMemo(() => categorySlices("income"), [inRange, categories]);

  const alerts = buildAlerts({ loans, payments, transactions, categories, budget: budgets.find((b) => b.month === period.from.slice(0, 8) + "01"), budgetCategories });

  const activities = useMemo(() => {
    const days = Number(activityDays);
    const cutoff = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
    return confirmed
      .filter((t) => t.tx_date.slice(0, 10) >= cutoff)
      .sort((a, b) => b.tx_date.localeCompare(a.tx_date))
      .slice(0, 8);
  }, [confirmed, activityDays]);

  const todayLabel = new Date()
    .toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })
    .toUpperCase();

  const ringRadius = 34;
  const ringCircumference = 2 * Math.PI * ringRadius;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{todayLabel}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Olá, <span className="text-primary">{name || "bem-vindo"}</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border bg-card px-1.5 py-1">
            <Button variant="ghost" size="icon" className="size-8 rounded-full" aria-label="Mês anterior" onClick={() => setMonthOffset((o) => o - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="tnum min-w-[130px] text-center text-sm font-bold">{period.label}</span>
            <Button variant="ghost" size="icon" className="size-8 rounded-full" aria-label="Mês seguinte" disabled={monthOffset >= 0} onClick={() => setMonthOffset((o) => o + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <ThemeToggle />
          <Button onClick={() => openTransaction("expense")} className="gap-2 rounded-full font-bold">
            <Plus className="size-4" /> Nova transação
          </Button>
        </div>
      </header>

      <section className="rounded-3xl border bg-card p-5 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:divide-x">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-muted-foreground">Saldo atual</p>
            <p className="tnum mt-1 break-words text-4xl font-extrabold sm:text-5xl">{fmtMoney(totalAccounts, hidden)}</p>
            <p className="mt-3 text-sm text-muted-foreground">Em {accounts.length} conta{accounts.length === 1 ? "" : "s"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Previsto no fim do mês <span className="tnum font-bold text-foreground">{fmtMoney(forecast, hidden)}</span>
            </p>
          </div>
          <div className="flex items-center gap-5 lg:pl-10">
            <div className="relative size-24 shrink-0">
              <svg viewBox="0 0 80 80" className="size-full -rotate-90">
                <circle cx="40" cy="40" r={ringRadius} fill="none" stroke="var(--color-muted)" strokeWidth="8" />
                <circle
                  cx="40"
                  cy="40"
                  r={ringRadius}
                  fill="none"
                  stroke={result >= 0 ? "var(--color-positive)" : "var(--color-destructive)"}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(ringCircumference * resultPercent) / 100} ${ringCircumference}`}
                />
              </svg>
              <span className="tnum absolute inset-0 grid place-items-center text-sm font-extrabold">{resultPercent}%</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-muted-foreground">Resultado do mês</p>
              <p className={cn("tnum mt-1 text-2xl font-extrabold", result > 0 ? "text-positive" : result < 0 ? "text-destructive" : "text-foreground")}>
                {fmtMoney(result, hidden)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {income === 0 ? "Nenhuma receita lançada no mês" : "Receitas menos despesas do mês"}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 border-t pt-5 sm:gap-5 sm:pt-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-positive/10 text-positive sm:size-10"><ArrowDownLeft className="size-4 sm:size-5" /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">Receitas</p>
                <p className="tnum break-words text-base font-extrabold text-positive sm:text-xl">{fmtMoney(income, hidden)}</p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-positive transition-[width]" style={{ width: `${income + expense > 0 ? (income / (income + expense)) * 100 : 0}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive sm:size-10"><ArrowUpRight className="size-4 sm:size-5" /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">Despesas</p>
                <p className="tnum break-words text-base font-extrabold text-destructive sm:text-xl">{fmtMoney(expense, hidden)}</p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-destructive transition-[width]" style={{ width: `${income + expense > 0 ? (expense / (income + expense)) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      </section>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm",
                a.level === "danger"
                  ? "border-destructive/30 bg-destructive/5 text-destructive"
                  : a.level === "warning"
                    ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400"
                    : "text-muted-foreground",
              )}
            >
              {a.text}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="min-w-0 rounded-3xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-bold">A receber</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="tnum">Pendente <span className="font-bold text-foreground">{fmtMoney(receivable, hidden)}</span></span>
              <Link to="/emprestimos" aria-label="Abrir empréstimos" className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground hover:text-foreground"><Maximize2 className="size-3.5" /></Link>
            </div>
          </div>
          {pendingLoans.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed px-4 text-center">
              <HandCoins className="mb-2 size-5 text-muted-foreground" />
              <p className="text-sm font-medium">Nada por receber</p>
              <p className="mt-1 text-xs text-muted-foreground">Os empréstimos pendentes aparecem aqui.</p>
            </div>
          ) : (
            <div className="divide-y">
              {pendingLoans.slice(0, 5).map(({ loan, summary }) => (
                <div key={loan.id} className="flex min-w-0 items-center gap-3 py-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground"><HandCoins className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{loan.person_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Total {fmtMoney(loan.amount, hidden)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tnum text-sm font-bold">{fmtMoney(summary.pending, hidden)}</p>
                    <Badge variant="secondary" className={cn("mt-0.5", summary.status === "Atrasado" && "bg-destructive/10 text-destructive", summary.status === "Parcial" && "bg-amber-500/10 text-amber-700 dark:text-amber-400")}>
                      {summary.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <DonutPanel title="Despesas por categoria" total={expenseDonut.total} slices={expenseDonut.slices} hidden={hidden} />
        <DonutPanel title="Receitas por categoria" total={incomeDonut.total} slices={incomeDonut.slices} hidden={hidden} />
      </div>

      <section className="min-w-0 rounded-3xl border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">Últimas atividades</h2>
          <div className="flex items-center gap-2">
            <Select value={activityDays} onValueChange={setActivityDays}>
              <SelectTrigger className="h-9 w-[110px] rounded-full" aria-label="Período das atividades">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Link to="/movimentacoes" className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground hover:text-foreground" aria-label="Ver todas"><Maximize2 className="size-4" /></Link>
          </div>
        </div>
        {activities.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed px-4 text-center">
            <ReceiptText className="mb-2 size-5 text-muted-foreground" />
            <p className="text-sm font-medium">Nenhum lançamento no período</p>
            <p className="mt-1 text-xs text-muted-foreground">Use “Nova transação” para registar a primeira.</p>
          </div>
        ) : (
          <div className="divide-y">
            {activities.map((transaction) => {
              const categoryName = categories.find((c) => c.id === transaction.category_id)?.name ?? null;
              const isTransfer = transaction.type === "transfer_in" || transaction.type === "transfer_out";
              const isPositive = transaction.type === "income" || transaction.type === "transfer_in";
              const typeLabel = isTransfer ? "Transferência" : transaction.type === "income" ? "Receita" : "Despesa";
              return (
                <div key={transaction.id} className="flex min-w-0 items-center gap-3 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-lg">{emojiFor(transaction.description ?? "", categoryName, transaction.type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{transaction.description || typeLabel}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{categoryName ?? typeLabel}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-md px-2 py-1 text-[10px] font-bold", isTransfer ? "bg-primary/10 text-primary" : transaction.type === "income" ? "bg-positive/10 text-positive" : "bg-destructive/10 text-destructive")}>
                    {typeLabel}
                  </span>
                  <p className={cn("tnum shrink-0 text-sm font-bold", isPositive ? "text-positive" : "text-foreground")}>
                    {isPositive ? "+" : "−"}{money(num(transaction.amount))}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function DonutPanel({ title, total, slices, hidden }: { title: string; total: number; slices: { name: string; value: number }[]; hidden: boolean }) {
  return (
    <section className="min-w-0 rounded-3xl border bg-card p-5">
      <h2 className="mb-4 font-bold">{title}</h2>
      {slices.length === 0 ? (
        <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed px-4 text-center">
          <p className="text-sm font-medium">Nada registado neste mês</p>
          <p className="mt-1 text-xs text-muted-foreground">Os lançamentos do mês aparecem aqui.</p>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative h-[190px] w-[46%] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={slices} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="95%" paddingAngle={2} strokeWidth={0}>
                  {slices.slice(0, 5).map((slice, index) => (
                    <Cell key={slice.name} fill={DONUT_PALETTE[index % DONUT_PALETTE.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Total</span>
              <span className="tnum mt-1 max-w-[90%] truncate text-base font-extrabold">{money(total)}</span>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {slices.slice(0, 5).map((slice, index) => (
              <div key={slice.name} className="flex min-w-0 items-center gap-2">
                <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: DONUT_PALETTE[index % DONUT_PALETTE.length] }} />
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{slice.name}</span>
                <span className="tnum shrink-0 text-xs font-bold">{money(slice.value)}<small className="ml-1 font-medium text-muted-foreground">{total > 0 ? `${Math.round((slice.value / total) * 100)}%` : ""}</small></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
