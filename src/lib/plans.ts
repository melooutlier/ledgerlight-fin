export type PlanId = "pessoal" | "avancado" | "casa";
export type Feature = "multi_accounts" | "photos" | "savings" | "transfers" | "household";

export const PLANS: Record<
  PlanId,
  { name: string; price: number; yearly: number; tagline: string; features: Feature[]; perks: string[] }
> = {
  pessoal: {
    name: "Pessoal",
    price: 0,
    yearly: 0,
    tagline: "Organização básica do dia a dia",
    features: [],
    perks: [
      "1 conta (ex.: M-Pesa ou dinheiro)",
      "Entradas e despesas ilimitadas",
      "Emojis automáticos",
      "Empréstimos, adiantamentos e orçamento",
    ],
  },
  avancado: {
    name: "Pessoal Avançado",
    price: 350,
    yearly: 3500,
    tagline: "M-Pesa, e-Mola, bancos, fotos e poupança",
    features: ["multi_accounts", "photos", "savings", "transfers"],
    perks: [
      "Tudo do Pessoal",
      "Contas ilimitadas (M-Pesa, e-Mola, bancos)",
      "Transferências entre contas",
      "Fotos de comprovativos e compras",
      "Metas de poupança com cofre",
    ],
  },
  casa: {
    name: "Casa",
    price: 650,
    yearly: 6500,
    tagline: "Gestão completa das despesas do lar",
    features: ["multi_accounts", "photos", "savings", "transfers", "household"],
    perks: [
      "Tudo do Pessoal Avançado",
      "Contas fixas da casa (energia, água, renda…)",
      "Quem paga o quê (membros da casa)",
      "Lembretes de vencimento mensais",
    ],
  },
};

export const ACCOUNT_LIMIT: Record<PlanId, number> = { pessoal: 1, avancado: Infinity, casa: Infinity };

export function hasFeature(plan: PlanId, f: Feature): boolean {
  return PLANS[plan].features.includes(f);
}

/** Plan in force today: expired or suspended subscriptions fall back to Pessoal. */
export function effectivePlan(
  sub: { plan: string; status: string; expires_at: string | null } | null | undefined,
  today: string,
): PlanId {
  if (!sub || sub.status !== "active") return "pessoal";
  if (sub.expires_at && sub.expires_at < today) return "pessoal";
  return sub.plan === "avancado" || sub.plan === "casa" ? sub.plan : "pessoal";
}
