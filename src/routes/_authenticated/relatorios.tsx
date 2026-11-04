import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCategories, useTransactions, usePlan, useCurrentUser } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { UpgradeButton } from "@/components/upgrade-notice";
import { exportMonthCSV, printMonthReport } from "@/lib/report-export";
import { dateLabel, money, monthLabel, num, shortMonth } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/relatorios")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Relatórios — Meu Financeiro" },
      { name: "description", content: "Resumo mensal, evolução e maiores despesas." },
      { property: "og:title", content: "Relatórios — Meu Financeiro" },
      { property: "og:description", content: "Resumo mensal, evolução e maiores despesas." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { can } = usePlan();
  const { data: user } = useCurrentUser();

  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [catId, setCatId] = useState("all");

  const years = useMemo(() => {
    const set = new Set(transactions.map((t) => t.tx_date.slice(0, 4)));
    set.add(String(now.getFullYear()));
    return Array.from(set).sort().reverse();
  }, [transactions, now]);

  const prefix = `${year}-${month}`;
  const monthRows = transactions.filter(
    (t) => t.tx_date.startsWith(prefix) && (catId === "all" || t.category_id === catId),
  );
  const income = monthRows.filter((t) => t.type === "income").reduce((s, t) => s + num(t.amount), 0);
  const expense = monthRows
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + num(t.amount), 0);

  const evolution = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const p = `${year}-${String(i + 1).padStart(2, "0")}`;
      const rows = transactions.filter(
        (t) => t.tx_date.startsWith(p) && (catId === "all" || t.category_id === catId),
      );
      const inc = rows.filter((t) => t.type === "income").reduce((s, t) => s + num(t.amount), 0);
      const exp = rows.filter((t) => t.type === "expense").reduce((s, t) => s + num(t.amount), 0);
      return { month: shortMonth(`${p}-01`), Receitas: inc, Despesas: exp, Saldo: inc - exp };
    });
  }, [transactions, year, catId]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthRows) {
      if (t.type !== "expense") continue;
      const key = t.category_id ?? "sem";
      map.set(key, (map.get(key) ?? 0) + num(t.amount));
    }
    return Array.from(map.entries())
      .map(([id, value]) => ({
        name: categories.find((c) => c.id === id)?.name ?? "Sem categoria",
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [monthRows, categories]);

  const biggest = monthRows
    .filter((t) => t.type === "expense")
    .sort((a, b) => num(b.amount) - num(a.amount))
    .slice(0, 8);

  return (
    <div>
      <PageHeader title="Relatórios" subtitle={monthLabel(`${prefix}-01`)} action={
        can("export") ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => printMonthReport({ prefix, rows: monthRows, categories, owner: user?.email ?? "" })}>Exportar PDF</Button>
            <Button size="sm" variant="outline" onClick={() => exportMonthCSV(prefix, monthRows, categories)}>Excel (CSV)</Button>
          </div>
        ) : <UpgradeButton size="sm" variant="outline">🔒 Exportar relatório</UpgradeButton>
      } />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label>Mês</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                <SelectItem key={m} value={m}>
                  {monthLabel(`${year}-${m}-01`).split(" de ")[0]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Ano</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={catId} onValueChange={setCatId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Receitas" value={income} tone="positive" />
        <StatCard label="Despesas" value={expense} tone="negative" />
        <StatCard label="Saldo" value={income - expense} tone="accent" />
      </div>

      <div className="mt-6 rounded-xl border bg-card p-4 sm:p-5">
        <p className="mb-4 text-sm font-semibold">Evolução mensal de {year}</p>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={70} />
              <Tooltip formatter={(v: number | string) => money(Number(v))} />
              <Line type="monotone" dataKey="Receitas" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Despesas" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Saldo" stroke="var(--color-chart-3)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 sm:p-5">
          <p className="mb-3 text-sm font-semibold">Despesas por categoria</p>
          {byCategory.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem despesas neste mês.</p>
          )}
          <div className="space-y-2">
            {byCategory.map((row) => (
              <div key={row.name}>
                <div className="tnum flex justify-between text-sm">
                  <span>{row.name}</span>
                  <span>{money(row.value)}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${expense > 0 ? (row.value / expense) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 sm:p-5">
          <p className="mb-3 text-sm font-semibold">Maiores despesas</p>
          {biggest.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem despesas neste mês.</p>
          )}
          <div className="divide-y">
            {biggest.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{dateLabel(t.tx_date)}</p>
                </div>
                <span className="tnum font-semibold">{money(t.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
