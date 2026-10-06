import { loanSummary, type Budget, type BudgetCategory, type Category, type Loan, type LoanPayment, type Transaction } from "./data";
import { daysBetween, money, num, todayISO } from "./format";
import { monthStartISO } from "./period";

export type Alert = { id: string; level: "info" | "warning" | "danger"; text: string };

export function buildAlerts(args: {
  loans: Loan[];
  payments: LoanPayment[];
  transactions: Transaction[];
  categories: Category[];
  budget?: Budget | undefined;
  budgetCategories: BudgetCategory[];
}): Alert[] {
  const { loans, payments, transactions, categories, budget, budgetCategories } = args;
  const alerts: Alert[] = [];
  const today = todayISO();

  for (const loan of loans) {
    const { status, pending } = loanSummary(loan, payments);
    if (status === "Pago") continue;
    if (status === "Atrasado") {
      alerts.push({
        id: `loan-late-${loan.id}`,
        level: "danger",
        text: `${loan.person_name} está atrasado: faltam ${money(pending)}.`,
      });
    } else if (loan.due_date) {
      const days = daysBetween(today, loan.due_date);
      if (days >= 0 && days <= 7) {
        alerts.push({
          id: `loan-soon-${loan.id}`,
          level: "warning",
          text: `${loan.person_name} deve pagar ${money(pending)} ${days === 0 ? "hoje" : `em ${days} dia(s)`}.`,
        });
      }
    }
  }

  const monthStart = monthStartISO();
  const monthExpenses = transactions.filter(
    (t) => t.type === "expense" && t.tx_date >= monthStart && t.tx_date <= today,
  );
  const spent = monthExpenses.reduce((s, t) => s + num(t.amount), 0);

  if (budget && num(budget.total_amount) > 0) {
    const limit = num(budget.total_amount);
    if (spent > limit) {
      alerts.push({
        id: "budget-over",
        level: "danger",
        text: `Orçamento mensal ultrapassado em ${money(spent - limit)}.`,
      });
    } else if (spent >= limit * 0.8) {
      alerts.push({
        id: "budget-near",
        level: "warning",
        text: `Já usou ${Math.round((spent / limit) * 100)}% do orçamento mensal.`,
      });
    }
  }

  for (const bc of budgetCategories) {
    if (budget && bc.budget_id !== budget.id) continue;
    const limit = num(bc.limit_amount);
    if (limit <= 0) continue;
    const name = categories.find((c) => c.id === bc.category_id)?.name ?? "Categoria";
    const used = monthExpenses
      .filter((t) => t.category_id === bc.category_id)
      .reduce((s, t) => s + num(t.amount), 0);
    if (used > limit) {
      alerts.push({
        id: `cat-over-${bc.id}`,
        level: "danger",
        text: `${name}: limite ultrapassado (${money(used)} de ${money(limit)}).`,
      });
    } else if (used >= limit * 0.8) {
      alerts.push({
        id: `cat-near-${bc.id}`,
        level: "warning",
        text: `${name}: perto do limite (${money(used)} de ${money(limit)}).`,
      });
    }
  }

  const expenses = transactions.filter((t) => t.type === "expense");
  if (expenses.length >= 5) {
    const avg = expenses.reduce((s, t) => s + num(t.amount), 0) / expenses.length;
    const big = monthExpenses.filter((t) => num(t.amount) > avg * 3);
    for (const t of big.slice(0, 2)) {
      alerts.push({
        id: `big-${t.id}`,
        level: "info",
        text: `Despesa acima da média: ${t.description} (${money(t.amount)}).`,
      });
    }
  }

  return alerts;
}
