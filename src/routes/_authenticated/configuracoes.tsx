import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
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
          <AccountForm initialName={(user?.user_metadata?.display_name as string) ?? (user?.user_metadata?.full_name as string) ?? ""} />
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

function AccountForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    if (pw && pw.length < 6) return toast.error("A palavra-passe precisa de pelo menos 6 caracteres.");
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ data: { display_name: name.trim() }, ...(pw ? { password: pw } : {}) });
      if (error) throw error;
      if (data.user) await supabase.from("profiles").update({ display_name: name.trim() }).eq("id", data.user.id);
      setPw("");
      toast.success(pw ? "Nome e palavra-passe guardados. Já pode entrar também com email e senha." : "Nome guardado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível guardar.");
    } finally { setBusy(false); }
  }
  return (
    <div className="mt-3 grid gap-2 sm:max-w-sm">
      <Input placeholder="O seu nome" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
      <Input type="password" placeholder="Nova palavra-passe (opcional)" value={pw} onChange={(e) => setPw(e.target.value)} />
      <p className="text-xs text-muted-foreground">Entrou com Google? Defina uma senha para entrar com o mesmo email — continua a ser uma única conta.</p>
      <Button onClick={save} disabled={busy}>Guardar</Button>
    </div>
  );
}
