import { createFileRoute } from "@tanstack/react-router";
import { TransactionsView } from "@/components/transactions-view";

export const Route = createFileRoute("/_authenticated/despesas")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Despesas — Meu Financeiro" },
      { name: "description", content: "Registe e filtre todas as suas despesas em meticais." },
      { property: "og:title", content: "Despesas — Meu Financeiro" },
      {
        property: "og:description",
        content: "Registe e filtre todas as suas despesas em meticais.",
      },
    ],
  }),
  component: () => <TransactionsView type="expense" />,
});
