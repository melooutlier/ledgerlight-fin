import { monthLabel, todayISO } from "./format";

export type PeriodKey = "this_month" | "last_month" | "last_30" | "custom";

export type Period = {
  key: PeriodKey;
  from: string;
  to: string;
  label: string;
};

function iso(d: Date): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function monthStartISO(d = new Date()): string {
  return iso(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function buildPeriod(key: PeriodKey, from?: string, to?: string): Period {
  const now = new Date();
  if (key === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      key,
      from: iso(start),
      to: iso(end),
      label: monthLabel(iso(start)),
    };
  }
  if (key === "last_30") {
    const start = new Date(now.getTime() - 29 * 86400000);
    return { key, from: iso(start), to: todayISO(), label: "Últimos 30 dias" };
  }
  if (key === "custom" && from && to) {
    return { key, from, to, label: "Período personalizado" };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { key: "this_month", from: iso(start), to: iso(end), label: monthLabel(iso(start)) };
}

export function inPeriod(dateISO: string, period: Period): boolean {
  const d = dateISO.slice(0, 10);
  return d >= period.from && d <= period.to;
}

export const EXPENSE_METHODS = [
  "Dinheiro",
  "M-Pesa",
  "e-Mola",
  "Conta bancária",
  "Cartão",
  "Outro",
];
