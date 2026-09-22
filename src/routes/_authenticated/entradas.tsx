import { createFileRoute } from "@tanstack/react-router";
import { TransactionsView } from "@/components/transactions-view";

export const Route = createFileRoute("/_authenticated/entradas")({
  head: () => ({
    meta: [
      { title: "Entradas — Meu Financeiro" },
      { name: "description", content: "Todo o dinheiro que recebeu, organizado por categoria." },
      { property: "og:title", content: "Entradas — Meu Financeiro" },
      {
        property: "og:description",
        content: "Todo o dinheiro que recebeu, organizado por categoria.",
      },
    ],
  }),
  component: () => <TransactionsView type="income" />,
});
