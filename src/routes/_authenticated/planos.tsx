import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { usePlan } from "@/lib/data";
import { dateLabel, money } from "@/lib/format";
import { PLANS, PLAN_IDS } from "@/lib/plans";
import { UpgradeButton } from "@/components/upgrade-notice";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/planos")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Planos — Meu Financeiro" },
      { name: "description", content: "Compare os planos Pessoal e Pessoal Avançado." },
      { property: "og:title", content: "Planos — Meu Financeiro" },
      { property: "og:description", content: "Compare os planos Pessoal e Pessoal Avançado." },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const { plan, subscription, isAdmin } = usePlan();
  return (
    <div>
      <PageHeader
        title="Planos"
        subtitle={
          isAdmin
            ? "Conta de administrador — todas as funcionalidades activas"
            : `Plano actual: ${PLANS[plan].name}${subscription?.expires_at && plan !== "pessoal" ? ` · válido até ${dateLabel(subscription.expires_at)}` : ""}`
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {PLAN_IDS.map((id) => {
          const p = PLANS[id];
          const current = id === plan;
          return (
            <div key={id} className={cn("flex flex-col rounded-2xl border bg-card p-6", current && "border-primary ring-1 ring-primary")}>
              <div className="flex items-center justify-between">
                <p className="font-semibold">{p.name}</p>
                {current && <Badge>Actual</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
              <p className="tnum mt-4 text-3xl font-bold">
                {money(p.price)}
                {p.price > 0 && <span className="text-sm font-normal text-muted-foreground"> /mês</span>}
              </p>
              {p.yearly > 0 && <p className="tnum text-xs text-muted-foreground">ou {money(p.yearly)} /ano (2 meses grátis)</p>}
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-positive" />{perk}</li>
                ))}
              </ul>
              {id === "avancado" && !current && <UpgradeButton className="mt-5 w-full">Fazer upgrade</UpgradeButton>}
            </div>
          );
        })}
      </div>
      <div className="mt-6 rounded-xl border bg-card p-5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">Como mudar de plano</p><UpgradeButton size="sm" variant="outline">Ver dados de pagamento</UpgradeButton></div>
        <p className="mt-1 text-muted-foreground">
          Envie o valor do plano por M-Pesa, e-Mola ou transferência bancária e contacte o administrador com o email da sua conta.
          O plano é activado logo após a confirmação do pagamento.
        </p>
      </div>
    </div>
  );
}
