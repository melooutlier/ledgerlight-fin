import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Clock, Copy, MessageCircle, Shield, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser, usePlan } from "@/lib/data";
import { money } from "@/lib/format";
import { PAYMENT, PLAN_IDS, PLANS, type PlanId } from "@/lib/plans";
import {
  ACCEPTED_RECEIPT_TYPES,
  MAX_RECEIPT_BYTES,
  METHODS,
  METHOD_LABEL,
  adminWhatsappUrl,
  digitsOnly,
  isMzMobile,
  isWhatsappValid,
  planAmount,
  useMyReceipts,
  useSubmitReceipt,
  type BillingCycle,
  type PaymentMethod,
  type PaymentReceipt,
} from "@/lib/payments";
import { cn } from "@/lib/utils";

async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value.replace(/\s/g, ""));
    toast.success("Copiado!");
  } catch {
    toast.error("Não foi possível copiar.");
  }
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-auto min-h-11 whitespace-normal px-3 py-2 text-sm",
        active && "border-primary bg-primary/10 text-foreground ring-1 ring-primary",
      )}
    >
      {children}
    </Button>
  );
}

export function ActivationScreen() {
  const { subscription } = usePlan();
  const { data: user } = useCurrentUser();
  const { data: receipts = [], isLoading } = useMyReceipts();

  const pending = receipts.find((receipt) => receipt.status === "pending");
  const latest = receipts[0];
  const rejected = !pending && latest?.status === "rejected" ? latest : undefined;
  const suspended = subscription?.status === "suspended";
  const expired =
    !!subscription?.expires_at &&
    subscription.expires_at.slice(0, 10) < new Date().toISOString().slice(0, 10);
  const title = pending
    ? "Pagamento em validação"
    : suspended && subscription?.expires_at
      ? "Acesso suspenso"
      : expired
        ? "O prazo de acesso terminou"
        : "Ative a sua conta Melfy";
  const description = pending
    ? "Recebemos a sua confirmação de pagamento."
    : "A sua conta está criada. Pague por M-Pesa, e-Mola ou transferência e confirme abaixo para libertar o painel.";

  return (
    <section className="mx-auto mt-4 max-w-2xl space-y-5 pb-8">
      <header className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
          {pending ? <Clock className="size-7" /> : <Shield className="size-7" />}
        </div>
        <h1 className="mt-4 text-xl font-bold">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      </header>

      {isLoading ? (
        <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">A carregar…</div>
      ) : pending ? (
        <PendingBanner receipt={pending} email={user?.email ?? ""} />
      ) : (
        <>
          {rejected && <RejectedNotice receipt={rejected} />}
          <ActivationForm
            initialPlan={
              subscription?.plan === "avancado" || subscription?.plan === "casa" ? "avancado" : "pessoal"
            }
            email={user?.email ?? ""}
          />
        </>
      )}
    </section>
  );
}

function PendingBanner({ receipt, email }: { receipt: PaymentReceipt; email: string }) {
  return (
    <div className="space-y-4 rounded-xl border border-primary/40 bg-primary/5 p-5 text-sm">
      <p className="leading-6">
        O seu pagamento está em validação. Assim que o administrador confirmar a receção do valor, o seu painel será
        libertado automaticamente.
      </p>
      <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-card p-4">
        <div>
          <dt className="text-xs text-muted-foreground">Plano</dt>
          <dd className="font-medium">
            {PLANS[receipt.plan].name} · {receipt.billing_cycle === "anual" ? "Anual" : "Mensal"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Valor</dt>
          <dd className="tnum font-medium">{money(receipt.amount)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Método</dt>
          <dd className="font-medium">{METHOD_LABEL[receipt.payment_method]}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Número de envio</dt>
          <dd className="tnum font-mono font-medium">{receipt.payment_phone}</dd>
        </div>
      </dl>
      <Button asChild className="w-full">
        <a href={adminWhatsappUrl(receipt, email)} target="_blank" rel="noreferrer">
          <MessageCircle className="size-4" /> Avisar Administrador no WhatsApp
        </a>
      </Button>
    </div>
  );
}

function RejectedNotice({ receipt }: { receipt: PaymentReceipt }) {
  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div>
        <p className="font-semibold">O seu último pedido foi recusado</p>
        <p className="mt-1 text-muted-foreground">{receipt.admin_notes || "Sem motivo indicado."}</p>
        <p className="mt-2 text-muted-foreground">Corrija os dados e submeta novamente abaixo.</p>
      </div>
    </div>
  );
}

function ActivationForm({ initialPlan, email }: { initialPlan: PlanId; email: string }) {
  const submit = useSubmitReceipt();
  const [plan, setPlan] = useState<PlanId>(initialPlan);
  const [cycle, setCycle] = useState<BillingCycle>("mensal");
  const [method, setMethod] = useState<PaymentMethod>("mpesa");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sameNumber, setSameNumber] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);

  const amount = planAmount(plan, cycle);
  const bank = method === "millennium_bim";
  const effectiveWhatsapp = sameNumber ? phone : whatsapp;

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    if (!picked) {
      setFile(null);
      return;
    }
    if (!ACCEPTED_RECEIPT_TYPES.includes(picked.type)) {
      toast.error("Envie uma imagem (JPG, PNG, WEBP) ou um PDF.");
      setFileKey((key) => key + 1);
      setFile(null);
      return;
    }
    if (picked.size > MAX_RECEIPT_BYTES) {
      toast.error("O ficheiro não pode ter mais de 5 MB.");
      setFileKey((key) => key + 1);
      setFile(null);
      return;
    }
    setFile(picked);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isMzMobile(phone)) {
      toast.error("Indique um número de envio moçambicano válido.");
      return;
    }
    if (!isWhatsappValid(effectiveWhatsapp)) {
      toast.error("Indique um número de WhatsApp válido.");
      return;
    }
    try {
      await submit.mutateAsync({
        plan,
        billing_cycle: cycle,
        payment_method: method,
        payment_phone: phone,
        whatsapp_phone: effectiveWhatsapp,
        file,
      });
      toast.success("Confirmação enviada. Avise o administrador no WhatsApp para acelerar a validação.");
    } catch (error) {
      const code = error && typeof error === "object" ? (error as { code?: string }).code : undefined;
      if (code === "23505") toast.error("Já tem um pedido em validação.");
      else toast.error(error instanceof Error && error.message ? error.message : "Não foi possível enviar. Tente novamente.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-xl border bg-card p-5 sm:p-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold">1. Escolha o plano</p>
        <div className="grid grid-cols-2 gap-2">
          {PLAN_IDS.map((id) => (
            <Choice key={id} active={plan === id} onClick={() => setPlan(id)}>
              {PLANS[id].name}
            </Choice>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Choice active={cycle === "mensal"} onClick={() => setCycle("mensal")}>
            Mensal
          </Choice>
          <Choice active={cycle === "anual"} onClick={() => setCycle("anual")}>
            Anual
          </Choice>
        </div>
        <div className="flex items-baseline justify-between gap-3 rounded-lg bg-muted/50 px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {PLANS[plan].name} · {cycle === "anual" ? "por ano" : "por mês"}
          </span>
          <span className="tnum text-2xl font-bold">{money(amount)}</span>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">2. Envie o valor para</p>
        {PAYMENT.methods.map((paymentMethod) => (
          <div key={paymentMethod.label} className="rounded-lg border bg-muted/40 p-3">
            <p className="text-sm font-semibold">{paymentMethod.label}</p>
            {paymentMethod.fields.map((field) => (
              <div key={field.name} className="mt-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{field.name}</p>
                  <p className="tnum break-all font-mono text-sm font-medium">{field.value}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copy(field.value)}
                  aria-label={`Copiar ${field.name} ${paymentMethod.label}`}
                >
                  <Copy className="size-4" /> Copiar
                </Button>
              </div>
            ))}
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          Todos os métodos em nome de <strong className="text-foreground">{PAYMENT.holder}</strong>.
        </p>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-semibold">3. Confirme o pagamento</p>
        <div className="space-y-1.5">
          <Label>Método utilizado</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {METHODS.map((paymentMethod) => (
              <Choice
                key={paymentMethod}
                active={method === paymentMethod}
                onClick={() => setMethod(paymentMethod)}
              >
                {METHOD_LABEL[paymentMethod]}
              </Choice>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="payment-phone">
            {bank
              ? "Telemóvel associado à transferência"
              : "Número de onde enviou o dinheiro (para identificarmos o pagamento)"}
          </Label>
          <Input
            id="payment-phone"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="84xxxxxxx"
            maxLength={12}
            value={phone}
            onChange={(event) => setPhone(digitsOnly(event.target.value).slice(0, 12))}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="whatsapp-phone">WhatsApp do cliente</Label>
          <Input
            id="whatsapp-phone"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="84xxxxxxx"
            maxLength={15}
            value={sameNumber ? phone : whatsapp}
            disabled={sameNumber}
            onChange={(event) => setWhatsapp(digitsOnly(event.target.value).slice(0, 15))}
            required
          />
          <div className="flex items-center gap-2 pt-1">
            <Checkbox id="same-number" checked={sameNumber} onCheckedChange={(checked) => setSameNumber(checked === true)} />
            <Label htmlFor="same-number" className="text-sm font-normal">
              Usar o mesmo número
            </Label>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="receipt-file">
            <Upload className="mr-1 inline size-4" /> Comprovativo {bank ? "(recomendado)" : "(opcional)"}
          </Label>
          <Input
            key={fileKey}
            id="receipt-file"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={onFile}
          />
          <p className="text-xs text-muted-foreground">Imagem ou PDF, até 5 MB.</p>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={submit.isPending}>
        {submit.isPending ? "A enviar…" : "Submeter Confirmação de Pagamento"}
      </Button>
      {email && <p className="text-center text-xs text-muted-foreground">Conta: {email}</p>}
    </form>
  );
}