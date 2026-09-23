import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useBudgetCategories,
  useBudgets,
  useCategories,
  useDeleteBudgetCategory,
  useSaveBudget,
  useSaveBudgetCategory,
  useTransactions,
} from "@/lib/data";
import { money, monthLabel, num } from "@/lib/format";
import { monthStartISO } from "@/lib/period";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/orcamento")({
  head: () => ({
    meta: [
      { title: "Orçamento — Meu Financeiro" },
      { name: "description", content: "Defina um limite mensal e limites por categoria." },
      { property: "og:title", content: "Orçamento — Meu Financeiro" },
      { property: "og:description", content: "Defina um limite mensal e limites por categoria." },
    ],
  }),
  component: BudgetPage,
});

function BudgetPage() {
  const month = monthStartISO();
  const { data: budgets = [] } = useBudgets();
  const { data: budgetCategories = [] } = useBudgetCategories();
  const { data: categories = [] } = useCategories();
  const { data: transactions = [] } = useTransactions();
  const saveBudget = useSaveBudget();
  const saveBc = useSaveBudgetCategory();
  const delBc = useDeleteBudgetCategory();

  const budget = budgets.find((b) => b.month === month);
  const [total, setTotal] = useState("");
  const [catId, setCatId] = useState("");
  const [limit, setLimit] = useState("");

  useEffect(() => {
    setTotal(budget ? String(num(budget.total_amount)) : "");
  }, [budget]);

  const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  const monthExpenses = transactions.filter(
    (t) => t.type === "expense" && t.tx_date >= month && t.tx_date <= monthEnd,
  );
  const spent = monthExpenses.reduce((s, t) => s + num(t.amount), 0);
  const limitTotal = num(budget?.total_amount);
  const pct = limitTotal > 0 ? Math.round((spent / limitTotal) * 100) : 0;

  const rows = budgetCategories.filter((bc) => !budget || bc.budget_id === budget.id);
  const expenseCats = categories.filter((c) => c.kind === "expense");

  return (
    <div>
      <PageHeader title="Orçamento" subtitle={monthLabel(month)} />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Limite do mês" value={limitTotal} />
        <StatCard label="Já gasto" value={spent} tone={spent > limitTotal && limitTotal > 0 ? "negative" : "neutral"} hint={limitTotal > 0 ? `${pct}% do orçamento` : undefined} />
        <StatCard label="Disponível" value={Math.max(limitTotal - spent, 0)} tone="accent" />
      </div>

      <div className="mt-6 rounded-xl border bg-card p-4 sm:p-5">
        <p className="mb-3 text-sm font-semibold">Limite mensal geral</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="total">Valor (MT)</Label>
            <Input
              id="total"
              type="number"
              min="0"
              className="w-[180px]"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </div>
          <Button
            onClick={async () => {
              await saveBudget.mutateAsync({ month, total_amount: Number(total || 0) });
              toast.success("Orçamento atualizado.");
            }}
          >
            Guardar
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-card p-4 sm:p-5">
        <p className="mb-3 text-sm font-semibold">Limites por categoria</p>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={catId} onValueChange={setCatId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Escolher" />
              </SelectTrigger>
              <SelectContent>
                {expenseCats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="limite">Limite (MT)</Label>
            <Input
              id="limite"
              type="number"
              min="0"
              className="w-[150px]"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </div>
          <Button
            className="gap-2"
            disabled={!catId || !limit || !budget}
            onClick={async () => {
              if (!budget) return;
              await saveBc.mutateAsync({
                budget_id: budget.id,
                category_id: catId,
                limit_amount: Number(limit),
              });
              setCatId("");
              setLimit("");
              toast.success("Limite guardado.");
            }}
          >
            <Plus className="size-4" /> Adicionar
          </Button>
        </div>

        {!budget && (
          <p className="text-sm text-muted-foreground">
            Guarde primeiro o limite mensal geral para poder definir limites por categoria.
          </p>
        )}

        <div className="space-y-3">
          {rows.map((bc) => {
            const cat = categories.find((c) => c.id === bc.category_id);
            const lim = num(bc.limit_amount);
            const used = monthExpenses
              .filter((t) => t.category_id === bc.category_id)
              .reduce((s, t) => s + num(t.amount), 0);
            const p = lim > 0 ? (used / lim) * 100 : 0;
            return (
              <div key={bc.id}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{cat?.name ?? "Categoria"}</span>
                  <span className="tnum flex items-center gap-2 text-muted-foreground">
                    {money(used)} de {money(lim)}
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remover limite"
                      className="size-7 text-destructive"
                      onClick={() => delBc.mutate(bc.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      p > 100 ? "bg-destructive" : p >= 80 ? "bg-amber-500" : "bg-primary",
                    )}
                    style={{ width: `${Math.min(p, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
