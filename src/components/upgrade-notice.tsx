import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, MessageCircle, Phone, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { money } from "@/lib/format";
import { PAYMENT, PLANS, type PlanId } from "@/lib/plans";

async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value.replace(/\s/g, ""));
    toast.success("Copiado!");
  } catch {
    toast.error("Não foi possível copiar.");
  }
}

export function PaymentDialog({ open, onOpenChange, plan = "avancado", annual = false, signup = false }: { open: boolean; onOpenChange: (o: boolean) => void; plan?: PlanId; annual?: boolean; signup?: boolean }) {
  const p = PLANS[plan];
  const wa = `https://wa.me/258${PAYMENT.contact}?text=${encodeURIComponent(`Olá, envio o comprovativo do plano ${p.name} (${annual ? "anual" : "mensal"}) do Melfy. Email da conta: `)}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="payment-info-dialog max-h-[90vh] overflow-y-auto !border-gray-200 !bg-white !text-gray-900">
        <DialogHeader>
          <DialogTitle>{signup ? "Aderir ao" : "Actualizar para"} {p.name}</DialogTitle>
          <DialogDescription>
            {signup ? `${money(annual ? p.yearly : p.price)}/${annual ? "ano" : "mês"}` : `${money(p.price)}/mês ou ${money(p.yearly)}/ano`}. Pague por um dos métodos abaixo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {PAYMENT.methods.map((m) => (
            <div key={m.label} className="rounded-xl border bg-muted/40 p-3">
              <p className="text-sm font-semibold">{m.label}</p>
              {m.fields.map((f) => (
                <div key={f.name} className="mt-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{f.name}</p>
                    <p className="tnum break-all font-mono text-sm font-medium">{f.value}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copy(f.value)} aria-label={`Copiar ${f.name} ${m.label}`}>
                    <Copy className="size-4" /> Copiar
                  </Button>
                </div>
              ))}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Todos os métodos em nome de <strong className="text-foreground">{PAYMENT.holder}</strong>.
          </p>
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
            Depois de efectuar o pagamento, envie o comprovativo pelo WhatsApp ou ligue para o número{" "}
            <strong className="tnum">{PAYMENT.contact}</strong>, indicando o email da sua conta.
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button asChild><a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="size-4" /> WhatsApp</a></Button>
            <Button asChild variant="outline"><a href={`tel:+258${PAYMENT.contact}`}><Phone className="size-4" /> Ligar</a></Button>
          </div>
          {signup && <Button asChild variant="outline" className="w-full"><Link to="/auth" search={{ mode: "signup", plan }}>Criar a minha conta Melfy</Link></Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function UpgradeButton({ children = "Fazer upgrade", ...rest }: { children?: ReactNode; size?: "sm" | "default"; className?: string; variant?: "default" | "outline" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button {...rest} onClick={() => setOpen(true)}>{children}</Button>
      <PaymentDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

export function UpgradeNotice({ what }: { plan?: string; what: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-card p-8 text-center">
      <Lock className="mx-auto size-8 text-muted-foreground" />
      <p className="mt-3 font-semibold">{what}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Disponível no plano {PLANS.avancado.name}. Actualize para desbloquear.
      </p>
      <UpgradeButton className="mt-4" />
    </div>
  );
}
