import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentDialog } from "@/components/upgrade-notice";
import { PLANS, PLAN_IDS, type PlanId } from "@/lib/plans";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PublicPlans() {
  const [annual, setAnnual] = useState(false);
  const [selected, setSelected] = useState<PlanId | null>(null);
  return <>
    <div className="mb-9 flex justify-center"><Tabs value={annual ? "annual" : "monthly"} onValueChange={v => setAnnual(v === "annual")}><TabsList className="h-12"><TabsTrigger value="monthly" className="px-5">Mensal</TabsTrigger><TabsTrigger value="annual" className="px-5">Anual · 2 meses grátis</TabsTrigger></TabsList></Tabs></div>
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">{PLAN_IDS.map(id => {
      const p = PLANS[id]; const advanced = id === "avancado";
      return <article key={id} className={cn("relative flex flex-col rounded-lg border bg-card p-6 sm:p-8", advanced && "border-primary ring-1 ring-primary")}>
        {advanced && <span className="absolute -top-3 right-5 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"><Sparkles className="size-3" /> Experiência completa</span>}
        <h3 className="text-xl font-bold">{p.name}</h3><p className="mt-2 text-sm text-muted-foreground">{advanced ? "Mais possibilidades para todos os seus planos." : "O essencial, sem complicar o seu dia."}</p>
        <div className="my-7"><span className="tnum text-4xl font-extrabold">{money(annual ? p.yearly : p.price)}</span><span className="ml-2 text-sm text-muted-foreground">/{annual ? "ano" : "mês"}</span></div>
        <Button variant={advanced ? "default" : "outline"} className="w-full" onClick={() => setSelected(id)}>Aderir ao {p.name} <ArrowRight /></Button>
        <ul className="mt-7 flex-1 space-y-3">{p.perks.map(perk => <li key={perk} className="flex gap-3 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-primary" /><span>{perk}</span></li>)}</ul>
        <Button asChild variant="link" className="mt-5"><Link to="/auth" search={{ mode: "signup", plan: id }}>Criar conta</Link></Button>
      </article>;
    })}</div>
    <p className="mt-7 text-center text-sm text-muted-foreground">Pagamento por M-Pesa, e-Mola ou Millennium BIM. Activação após confirmação do pagamento.</p>
    <PaymentDialog open={selected !== null} onOpenChange={o => !o && setSelected(null)} plan={selected ?? "pessoal"} annual={annual} signup />
  </>;
}