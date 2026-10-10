import type { Category, Transaction } from "@/lib/data";
import { dateLabel, money, monthLabel, num } from "@/lib/format";

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}

export function exportMonthCSV(prefix: string, rows: Transaction[], categories: Category[]) {
  const cat = new Map(categories.map((c) => [c.id, c.name]));
  const lines = [["Data", "Tipo", "Descrição", "Categoria", "Método", "Valor (MT)"]];
  for (const t of [...rows].sort((a, b) => a.tx_date.localeCompare(b.tx_date))) {
    if (t.type !== "income" && t.type !== "expense") continue;
    lines.push([
      t.tx_date,
      t.type === "income" ? "Entrada" : "Despesa",
      t.description,
      cat.get(t.category_id ?? "") ?? "",
      t.method ?? "",
      String(t.type === "income" ? num(t.amount) : -num(t.amount)),
    ]);
  }
  const csv = "\uFEFF" + lines.map((l) => l.map((v) => `"${v.replace(/"/g, '""')}"`).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `relatorio-${prefix}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printMonthReport({ prefix, rows, categories, owner }: { prefix: string; rows: Transaction[]; categories: Category[]; owner: string }) {
  const cat = new Map(categories.map((c) => [c.id, c.name]));
  const tx = rows.filter((t) => t.type === "income" || t.type === "expense").sort((a, b) => a.tx_date.localeCompare(b.tx_date));
  const inc = tx.filter((t) => t.type === "income").reduce((s, t) => s + num(t.amount), 0);
  const exp = tx.filter((t) => t.type === "expense").reduce((s, t) => s + num(t.amount), 0);
  const byCat = new Map<string, number>();
  for (const t of tx) if (t.type === "expense") { const k = cat.get(t.category_id ?? "") ?? "Sem categoria"; byCat.set(k, (byCat.get(k) ?? 0) + num(t.amount)); }
  const catRows = [...byCat].sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="r">${money(v)}</td><td class="r">${exp ? ((v / exp) * 100).toFixed(1) : 0}%</td></tr>`).join("");
  const txRows = tx.map((t) => `<tr><td>${dateLabel(t.tx_date)}</td><td>${esc(t.description)}</td><td>${esc(cat.get(t.category_id ?? "") ?? "")}</td><td class="r ${t.type}">${t.type === "income" ? "+" : "−"}${money(t.amount)}</td></tr>`).join("");
  const html = `<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>Relatório ${monthLabel(`${prefix}-01`)}</title>
<style>body{font-family:system-ui,sans-serif;color:#111;margin:32px}h1{margin:0;color:#00573a}.muted{color:#666;font-size:12px}
.cards{display:flex;gap:12px;margin:20px 0}.card{flex:1;border:1px solid #ddd;border-radius:8px;padding:12px}.card b{display:block;font-size:18px;margin-top:4px}
table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px}th,td{padding:6px 8px;border-bottom:1px solid #eee;text-align:left}th{background:#f3f4f3}
.r{text-align:right}.income{color:#00573a}.expense{color:#b42318}h2{font-size:14px;border-left:4px solid #00573a;padding-left:8px}</style></head><body>
<h1>Meu Financeiro</h1><p class="muted">Relatório mensal · ${monthLabel(`${prefix}-01`)} · ${esc(owner)} · emitido em ${new Date().toLocaleDateString("pt-PT")}</p>
<div class="cards"><div class="card">Entradas<b class="income">${money(inc)}</b></div><div class="card">Despesas<b class="expense">${money(exp)}</b></div><div class="card">Saldo do mês<b>${money(inc - exp)}</b></div></div>
<h2>Despesas por categoria</h2><table><tr><th>Categoria</th><th class="r">Total</th><th class="r">%</th></tr>${catRows || '<tr><td colspan="3">Sem despesas</td></tr>'}</table>
<h2>Movimentos</h2><table><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th class="r">Valor</th></tr>${txRows || '<tr><td colspan="4">Sem movimentos</td></tr>'}</table>
<script>window.onload=()=>window.print()</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
