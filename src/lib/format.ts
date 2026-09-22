const nf = new Intl.NumberFormat("pt-PT", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 1500 -> "1.500 MT" */
export function money(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return `${nf.format(Number.isFinite(n) ? n : 0)} MT`;
}

export function num(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function monthLabel(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return `${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

export function shortMonth(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return `${MONTHS[d.getMonth()].slice(0, 3)}/${String(d.getFullYear()).slice(2)}`;
}

export function dateLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(`${fromISO.slice(0, 10)}T00:00:00`).getTime();
  const b = new Date(`${toISO.slice(0, 10)}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}
