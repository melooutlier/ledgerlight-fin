import { createFileRoute } from "@tanstack/react-router";
import { TransactionsView } from "@/components/transactions-view";

export const Route = createFileRoute("/_authenticated/entradas")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Receitas — Melfy" },
      { name: "description", content: "Todo o dinheiro que recebeu, organizado por categoria." },
      { property: "og:title", content: "Receitas — Melfy" },
      {
        property: "og:description",
        content: "Todo o dinheiro que recebeu, organizado por categoria.",
      },
    ],
  }),
  component: () => <TransactionsView type="income" />,
});
