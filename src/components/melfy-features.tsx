import { ArrowDownUp, Wallet, PieChart, Target, Camera, HandCoins } from "lucide-react";

const features = [
  { icon: ArrowDownUp, title: "Cada movimento, no seu lugar", text: "Entradas e despesas organizadas por categoria, com confirmação de pagamento e emojis.", tag: "Pessoal" },
  { icon: Wallet, title: "Todas as suas carteiras", text: "M-Pesa, e-Mola, banco ou dinheiro. Veja os saldos e transfira entre contas.", tag: "Avançado" },
  { icon: PieChart, title: "Números que fazem sentido", text: "Acompanhe o orçamento mensal e exporte relatórios detalhados no plano Avançado.", tag: "Pessoal + Avançado" },
  { icon: Target, title: "Poupar com um objectivo", text: "Crie metas e acompanhe o progresso numa conta dedicada aos seus sonhos.", tag: "Avançado" },
  { icon: Camera, title: "O comprovativo fica consigo", text: "Guarde fotografias das compras e dos comprovativos junto de cada movimento.", tag: "Avançado" },
  { icon: HandCoins, title: "Não perca o que tem a receber", text: "Empréstimos, pagamentos parciais e adiantamentos, sempre separados das despesas.", tag: "Pessoal" },
];
export function MelfyFeatures({ full = false }: { full?: boolean }) {
  return <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{(full ? features : features.slice(0, 3)).map(f => <article key={f.title}><span className="mb-5 inline-flex size-12 items-center justify-center rounded-lg bg-accent text-primary"><f.icon className="size-6" /></span><h3 className="text-lg font-bold">{f.title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{f.text}</p><p className="mt-4 text-xs font-semibold text-primary">{f.tag}</p></article>)}</div>;
}