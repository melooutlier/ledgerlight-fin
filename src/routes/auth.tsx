import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Meu Financeiro" },
      {
        name: "description",
        content: "Aceda à sua conta do Meu Financeiro para gerir receitas, despesas e empréstimos.",
      },
      { property: "og:title", content: "Entrar — Meu Financeiro" },
      {
        property: "og:description",
        content: "Aceda à sua conta do Meu Financeiro para gerir receitas, despesas e empréstimos.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error("Indique um email válido e uma palavra-passe com pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name.trim() || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setCheckEmail(true);
          return;
        }
        navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível continuar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="size-5" />
          </span>
          <h1 className="mt-4 text-2xl font-bold">Meu Financeiro</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Controle as suas entradas, despesas e empréstimos.
          </p>
        </div>

        {checkEmail ? (
          <div className="rounded-xl border bg-card p-6 text-center text-sm">
            <p className="font-medium">Confirme o seu email</p>
            <p className="mt-2 text-muted-foreground">
              Enviámos uma mensagem para <strong>{email}</strong>. Clique no link para activar a
              conta e depois volte aqui para entrar.
            </p>
            <Button variant="outline" className="mt-4 w-full" onClick={() => setCheckEmail(false)}>
              Voltar
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={name}
                    maxLength={80}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="O seu nome"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  maxLength={255}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@email.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Palavra-passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {mode === "signin" ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              ou
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button variant="outline" className="w-full" onClick={handleGoogle}>
              Continuar com Google
            </Button>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              {mode === "signin" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
              <button
                type="button"
                className="font-medium text-primary underline-offset-4 hover:underline"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              >
                {mode === "signin" ? "Criar conta" : "Entrar"}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
