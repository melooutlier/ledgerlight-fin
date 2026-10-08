import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PLANS, type PlanId } from "@/lib/plans";

export function UpgradeNotice({ plan, what }: { plan: PlanId; what: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-card p-8 text-center">
      <p className="text-3xl">🔒</p>
      <p className="mt-3 font-semibold">{what}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Disponível no plano {PLANS[plan].name} ({PLANS[plan].price.toLocaleString("pt-PT")} MT/mês).
      </p>
      <Button asChild className="mt-4">
        <Link to="/planos">Ver planos</Link>
      </Button>
    </div>
  );
}
