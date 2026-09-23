import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import { ArrowDownLeft, ArrowUpRight, HandCoins, Wallet } from "lucide-react";
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
import { money, num, shortMonth } from "@/lib/format";
import { buildPeriod, inPeriod, monthStartISO, type PeriodKey } from "@/lib/period";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
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

      <div className="mt-6 rounded-xl border bg-card p-4 sm:p-5">
        <p className="mb-4 text-sm font-semibold">Entradas vs Despesas vs Saldo</p>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={70} />
              <Tooltip formatter={(v: number | string) => money(Number(v))} />
              <Legend />
              <Bar dataKey="Entradas" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesas" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Saldo" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
