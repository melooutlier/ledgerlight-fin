export type PlanId = "pessoal" | "avancado";
export type Feature = "multi_accounts" | "photos" | "savings" | "transfers" | "household" | "export";

export const PLANS: Record<
  PlanId,
  { name: string; price: number; yearly: number; tagline: string; features: Feature[]; perks: string[] }
> = {
  pessoal: {
    name: "Pessoal",
    price: 150,
    yearly: 1500,
    tagline: "Simples: o essencial do dia a dia",
    features: [],
    perks: [
      "1 conta (carteira principal)",
      "Entradas e despesas ilimitadas",
      "Emojis automáticos",
      "Empréstimos, adiantamentos e orçamento",
      "Relatórios no ecrã",
    ],
  },
  avancado: {
    name: "Pessoal Avançado",
    price: 350,
    yearly: 3500,
    tagline: "Completo: contas, fotos, poupança e exportação",
    features: ["multi_accounts", "photos", "savings", "transfers", "household", "export"],
    perks: [
      "Tudo do Pessoal",
      "Contas ilimitadas (M-Pesa, e-Mola, bancos)",
      "Transferências entre contas",
      "Fotos de comprovativos e compras",
      "Metas de poupança com cofre",
      "Contas fixas da casa",
      "Relatório mensal exportável (PDF e Excel)",
    ],
  },
};

export const PLAN_IDS: PlanId[] = ["pessoal", "avancado"];
export const ACCOUNT_LIMIT: Record<PlanId, number> = { pessoal: 1, avancado: Infinity };

export function hasFeature(plan: PlanId, f: Feature): boolean {
  return PLANS[plan].features.includes(f);
}

/** Plan in force today: expired or suspended subscriptions fall back to Pessoal (all advanced features locked). */
export function effectivePlan(
  sub: { plan: string; status: string; expires_at: string | null } | null | undefined,
  today: string,
): PlanId {
  if (!sub || sub.status !== "active") return "pessoal";
  if (sub.expires_at && sub.expires_at < today) return "pessoal";
  // "casa" is a retired plan id; treat it as Pessoal Avançado.
  return sub.plan === "avancado" || sub.plan === "casa" ? "avancado" : "pessoal";
}

export const PAYMENT = {
  holder: "João de Melo Salomão Massingue",
  contact: "852082348",
  methods: [
    { label: "M-Pesa", fields: [{ name: "Número", value: "852082348" }] },
    { label: "e-Mola", fields: [{ name: "Número", value: "874677196" }] },
    {
      label: "Millennium BIM",
      fields: [
        { name: "NIB", value: "0001 00000125392414257" },
        { name: "Número de conta", value: "1253924142" },
      ],
    },
  ],
};
