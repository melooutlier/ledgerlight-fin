import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownLeft, ArrowUpRight, HandCoins, Wallet, ArrowRight, ReceiptText, Tags, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PeriodPicker } from "@/components/period-picker";
import { StatCard } from "@/components/stat-card";
import { QuickAdd } from "@/components/app-shell";
import { buildAlerts } from "@/lib/alerts";
import {
  loanSummary,
  useBudgetCategories,
  useBudgets,
  useCategories,
  useCurrentUser,
  useLoanPayments,
  useLoans,
  useTransactions,
} from "@/lib/data";
import { money, num, shortMonth, dateLabel } from "@/lib/format";
import { buildPeriod, inPeriod, monthStartISO, type PeriodKey } from "@/lib/period";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/inicio")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Dashboard — Meu Financeiro" },
      { name: "description", content: "Veja o seu saldo, entradas, despesas e valores a receber." },
      { property: "og:title", content: "Dashboard — Meu Financeiro" },
      {
        property: "og:description",
        content: "Veja o seu saldo, entradas, despesas e valores a receber.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [key, setKey] = useState<PeriodKey>("this_month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const period = useMemo(() => buildPeriod(key, from, to), [key, from, to]);

  const { data: user } = useCurrentUser();
  const { data: transactions = [] } = useTransactions();
  const { data: loans = [] } = useLoans();
  const { data: payments = [] } = useLoanPayments();
  const { data: categories = [] } = useCategories();
  const { data: budgets = [] } = useBudgets();
  const { data: budgetCategories = [] } = useBudgetCategories();

  const inRange = transactions.filter((t) => inPeriod(t.tx_date, period));
  const income = inRange.filter((t) => t.type === "income").reduce((s, t) => s + num(t.amount), 0);
  const expense = inRange.filter((t) => t.type === "expense").reduce((s, t) => s + num(t.amount), 0);
  const receivable = loans.reduce((s, l) => s + loanSummary(l, payments).pending, 0);
  const recentTransactions = [...inRange]
    .sort((a, b) => b.tx_date.localeCompare(a.tx_date))
    .slice(0, 5);
  const expenseCategories = categories
    .filter((category) => category.kind === "expense")
    .map((category) => ({
      ...category,
      total: inRange
        .filter((transaction) => transaction.type === "expense" && transaction.category_id === category.id)
        .reduce((sum, transaction) => sum + num(transaction.amount), 0),
    }))
    .filter((category) => category.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const budget = budgets.find((b) => b.month === monthStartISO());
  const alerts = buildAlerts({
    loans,
    payments,
    transactions,
    categories,
    budget,
    budgetCategories,
  });

  const chart = useMemo(() => {
    const months: { month: string; Entradas: number; Despesas: number; Saldo: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const endISO = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
      const rows = transactions.filter((t) => t.tx_date >= start && t.tx_date <= endISO);
      const inc = rows.filter((t) => t.type === "income").reduce((s, t) => s + num(t.amount), 0);
      const exp = rows.filter((t) => t.type === "expense").reduce((s, t) => s + num(t.amount), 0);
      months.push({ month: shortMonth(start), Entradas: inc, Despesas: exp, Saldo: inc - exp });
    }
    return months;
  }, [transactions]);

  const name = (user?.user_metadata?.["display_name"] as string | undefined) ?? "";

  return (
    <div>
      <PageHeader
        title={`Olá 👋 ${name}`.trim()}
        subtitle={period.label}
        action={<QuickAdd compact />}
      />

      <div className="mb-6">
        <PeriodPicker
          value={key}
          onChange={setKey}
          from={from}
          to={to}
          onFrom={setFrom}
          onTo={setTo}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saldo" value={income - expense} icon={Wallet} tone="accent" hint="Entradas menos despesas" />
        <StatCard label="Entradas" value={income} icon={ArrowUpRight} tone="positive" />
        <StatCard label="Despesas" value={expense} icon={ArrowDownLeft} tone="negative" />
        <StatCard label="A receber" value={receivable} icon={HandCoins} hint="Dinheiro emprestado por receber" />
      </div>

      {alerts.length > 0 && (
        <div className="mt-6 space-y-2">
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

      <div className="mt-8 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <section className="min-w-0 rounded-2xl border bg-card p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><TrendingUp className="size-4" /></span>
                <h2 className="font-semibold">Evolução financeira</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Compara entradas, despesas e saldo dos últimos seis meses.</p>
            </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={64} />
                <Tooltip formatter={(v: number | string) => money(Number(v))} />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="Entradas" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="Despesas" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="Saldo" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border bg-card p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-muted"><Tags className="size-4" /></span>
                <h2 className="font-semibold">Maiores despesas</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Por categoria neste período.</p>
            </div>
            <Link to="/categorias" className="text-sm font-medium text-primary hover:underline">Ver todas</Link>
          </div>
          {expenseCategories.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center">
              <Tags className="mb-2 size-5 text-muted-foreground" />
              <p className="text-sm font-medium">Ainda sem despesas por categoria</p>
              <p className="mt-1 text-xs text-muted-foreground">Regista uma despesa para veres aqui a distribuição.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {expenseCategories.map((category) => {
                const percent = expense > 0 ? Math.min(100, (category.total / expense) * 100) : 0;
                return (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-medium">{category.name}</span>
                      <span className="tnum shrink-0 text-muted-foreground">{money(category.total)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="text-right text-xs text-muted-foreground">{percent.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}% das despesas</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="mt-5 rounded-2xl border bg-card p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-muted"><ReceiptText className="size-4" /></span>
              <h2 className="font-semibold">Movimentações recentes</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Os últimos registos do período selecionado.</p>
          </div>
          <Link to="/movimentacoes" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            Ver movimentações <ArrowRight className="size-4" />
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center">
            <ReceiptText className="mb-2 size-5 text-muted-foreground" />
            <p className="text-sm font-medium">Nenhuma movimentação neste período</p>
            <p className="mt-1 text-xs text-muted-foreground">Usa “Nova movimentação” para registar a primeira.</p>
          </div>
        ) : (
          <div className="divide-y">
            {recentTransactions.map((transaction) => {
              const categoryName = categories.find((category) => category.id === transaction.category_id)?.name ?? "Sem categoria";
              const isIncome = transaction.type === "income";
              return (
                <div key={transaction.id} className="flex min-w-0 items-center gap-3 py-3">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", isIncome ? "bg-positive/10 text-positive" : "bg-destructive/10 text-destructive")}>
                    {isIncome ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{transaction.description || (isIncome ? "Entrada" : "Despesa")}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{categoryName} · {dateLabel(transaction.tx_date)}</p>
                  </div>
                  <p className={cn("tnum shrink-0 text-sm font-semibold", isIncome ? "text-positive" : "text-foreground")}>
                    {isIncome ? "+" : "−"}{money(num(transaction.amount))}
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
