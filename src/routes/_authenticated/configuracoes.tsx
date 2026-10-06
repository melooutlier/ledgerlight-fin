import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useClearDemoData, useCurrentUser } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Configurações — Meu Financeiro" },
      { name: "description", content: "A sua conta, moeda e dados de demonstração." },
      { property: "og:title", content: "Configurações — Meu Financeiro" },
      { property: "og:description", content: "A sua conta, moeda e dados de demonstração." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: user } = useCurrentUser();
  const clearDemo = useClearDemoData();
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Conta e preferências" />

      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4 sm:p-5">
          <p className="text-sm font-semibold">Conta</p>
          <p className="mt-1 text-sm text-muted-foreground">{user?.email ?? "—"}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 sm:p-5">
          <p className="text-sm font-semibold">Moeda</p>
          <p className="mt-1 text-sm text-muted-foreground">Metical moçambicano (MT)</p>
        </div>

        <div className="rounded-xl border bg-card p-4 sm:p-5">
          <p className="text-sm font-semibold">Dados de demonstração</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Os registos marcados como “demo” servem apenas de exemplo. Pode apagá-los quando quiser.
          </p>
          <Button
            variant="outline"
            className="mt-3"
            disabled={clearDemo.isPending}
            onClick={async () => {
              await clearDemo.mutateAsync();
              toast.success("Dados de demonstração apagados.");
            }}
          >
            Apagar dados de demonstração
          </Button>
        </div>

        <div className="rounded-xl border bg-card p-4 sm:p-5">
          <p className="text-sm font-semibold">Sessão</p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            Terminar sessão
          </Button>
        </div>
      </div>
    </div>
  );
}
