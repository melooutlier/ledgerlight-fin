import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMovements } from "@/components/movements";
import { advanceSummary, useAdvances, useDeleteRow, useTransactions } from "@/lib/data";
import { dateLabel, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/adiantamentos")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Adiantamentos — Meu Financeiro" },
      {
        name: "description",
        content: "Dinheiro adiantado que só vira despesa quando indica onde foi usado.",
      },
      { property: "og:title", content: "Adiantamentos — Meu Financeiro" },
      {
        property: "og:description",
        content: "Dinheiro adiantado que só vira despesa quando indica onde foi usado.",
      },
    ],
  }),
  component: AdvancesPage,
});

function AdvancesPage() {
  const { data: advances = [] } = useAdvances();
  const { data: transactions = [] } = useTransactions();
  const { openAdvance, openTransaction } = useMovements();
  const del = useDeleteRow("personal_advances");

  const rows = advances.map((a) => ({ advance: a, ...advanceSummary(a, transactions) }));
  const total = rows.reduce((s, r) => s + r.total, 0);
  const used = rows.reduce((s, r) => s + r.used, 0);

  return (
    <div>
      <PageHeader
        title="Adiantamentos pessoais"
        subtitle="Só contam como despesa depois de registar onde o dinheiro foi usado"
        action={
          <Button onClick={() => openAdvance()} className="gap-2">
            <Plus className="size-4" /> Novo adiantamento
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total adiantado" value={total} />
        <StatCard label="Já justificado" value={used} tone="negative" />
        <StatCard label="Por justificar" value={total - used} tone="accent" />
      </div>

      <div className="mt-6 space-y-3">
        {rows.length === 0 && (
          <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
            Ainda não registou adiantamentos.
          </p>
        )}
        {rows.map(({ advance, used: u, total: tot, remaining }) => (
          <div key={advance.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{advance.purpose}</p>
                  {advance.is_demo && <Badge variant="outline">demo</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {dateLabel(advance.advance_date)}
                  {advance.notes ? ` · ${advance.notes}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="tnum text-lg font-bold">{money(tot)}</p>
                <p className="tnum text-xs text-muted-foreground">
                  Usado {money(u)} · Resta {money(remaining)}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => openTransaction("expense")}>
                Registar utilização
              </Button>
              <Button size="sm" variant="ghost" onClick={() => openAdvance(advance)}>
                <Pencil className="size-4" /> Editar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => del.mutate(advance.id)}
              >
                <Trash2 className="size-4" /> Eliminar
              </Button>
            </div>
            {transactions.filter((t) => t.advance_id === advance.id).length > 0 && (
              <div className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                {transactions
                  .filter((t) => t.advance_id === advance.id)
                  .map((t) => (
                    <div key={t.id} className="tnum flex justify-between py-0.5">
                      <span>
                        {dateLabel(t.tx_date)} · {t.description}
                      </span>
                      <span>{money(t.amount)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
