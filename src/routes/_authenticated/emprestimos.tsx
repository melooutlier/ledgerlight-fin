import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMovements } from "@/components/movements";
import {
  loanSummary,
  useDeleteRow,
  useLoanPayments,
  useLoans,
  type LoanStatus,
} from "@/lib/data";
import { dateLabel, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/emprestimos")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Empréstimos — Meu Financeiro" },
      { name: "description", content: "Controle o dinheiro que emprestou e o que ainda falta receber." },
      { property: "og:title", content: "Empréstimos — Meu Financeiro" },
      {
        property: "og:description",
        content: "Controle o dinheiro que emprestou e o que ainda falta receber.",
      },
    ],
  }),
  component: LoansPage,
});

function statusTone(status: LoanStatus) {
  if (status === "Pago") return "bg-primary/10 text-primary";
  if (status === "Atrasado") return "bg-destructive/10 text-destructive";
  if (status === "Parcial") return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
  return "bg-muted text-muted-foreground";
}

function LoansPage() {
  const { data: loans = [] } = useLoans();
  const { data: payments = [] } = useLoanPayments();
  const { openLoan, openPayment } = useMovements();
  const del = useDeleteRow("loans");

  const rows = loans.map((l) => ({ loan: l, ...loanSummary(l, payments) }));
  const total = rows.reduce((s, r) => s + r.total, 0);
  const received = rows.reduce((s, r) => s + r.paid, 0);
  const pending = rows.reduce((s, r) => s + r.pending, 0);
  const late = rows.filter((r) => r.status === "Atrasado").length;

  return (
    <div>
      <PageHeader
        title="Empréstimos"
        subtitle="Dinheiro que emprestou a outras pessoas"
        action={
          <Button onClick={() => openLoan()} className="gap-2">
            <Plus className="size-4" /> Novo empréstimo
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total emprestado" value={total} />
        <StatCard label="Já recebido" value={received} tone="positive" />
        <StatCard label="Pendente" value={pending} tone="accent" />
        <StatCard label="Em atraso" value={rows.filter((r) => r.status === "Atrasado").reduce((s, r) => s + r.pending, 0)} tone="negative" hint={`${late} empréstimo(s)`} />
      </div>

      <div className="mt-6 space-y-3">
        {rows.length === 0 && (
          <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
            Ainda não registou nenhum empréstimo.
          </p>
        )}
        {rows.map(({ loan, paid, pending: pend, total: tot, status }) => (
          <div key={loan.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{loan.person_name}</p>
                  <Badge variant="secondary" className={statusTone(status)}>
                    {status}
                  </Badge>
                  {loan.is_demo && <Badge variant="outline">demo</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {loan.reason || "Sem motivo indicado"} · emprestado a {dateLabel(loan.loan_date)}
                  {loan.due_date ? ` · devolver até ${dateLabel(loan.due_date)}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="tnum text-lg font-bold">{money(tot)}</p>
                <p className="tnum text-xs text-muted-foreground">
                  Pago {money(paid)} · Falta {money(pend)}
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${tot > 0 ? Math.min((paid / tot) * 100, 100) : 0}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => openPayment(loan)} disabled={pend <= 0}>
                Registar pagamento
              </Button>
              <Button size="sm" variant="ghost" onClick={() => openLoan(loan)}>
                <Pencil className="size-4" /> Editar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => del.mutate(loan.id)}
              >
                <Trash2 className="size-4" /> Eliminar
              </Button>
            </div>
            {payments.filter((p) => p.loan_id === loan.id).length > 0 && (
              <div className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                {payments
                  .filter((p) => p.loan_id === loan.id)
                  .map((p) => (
                    <div key={p.id} className="tnum flex justify-between py-0.5">
                      <span>{dateLabel(p.paid_at)}</span>
                      <span>{money(p.amount)}</span>
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
