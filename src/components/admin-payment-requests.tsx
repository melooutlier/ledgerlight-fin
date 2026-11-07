import { useState } from "react";
import { FileText, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { dateLabel, money } from "@/lib/format";
import { PLANS } from "@/lib/plans";
import {
  METHOD_LABEL,
  timeAgo,
  useAdminReceipts,
  useApproveReceipt,
  usePendingReceiptCount,
  useRejectReceipt,
  useSignedReceiptUrl,
  waNumber,
  type AdminReceipt,
  type ReceiptStatus,
} from "@/lib/payments";
import { cn } from "@/lib/utils";

const FILTERS: { id: ReceiptStatus; label: string }[] = [
  { id: "pending", label: "Pendentes" },
  { id: "approved", label: "Aprovados" },
  { id: "rejected", label: "Rejeitados" },
];

const QUICK_REASONS = [
  "Número remetente não encontrado nos extratos",
  "Valor insuficiente",
  "Comprovativo ilegível",
];

function errorText(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

export function PaymentRequestsSection() {
  const [status, setStatus] = useState<ReceiptStatus>("pending");
  const { data: rows = [], isLoading } = useAdminReceipts(status);
  const { data: pendingCount = 0 } = usePendingReceiptCount();

  return (
    <section className="mb-6" aria-labelledby="payment-requests-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="payment-requests-title" className="text-base font-semibold">
          Pedidos de Ativação e Comprovativos
        </h2>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((filter) => (
            <Button
              key={filter.id}
              size="sm"
              variant={status === filter.id ? "default" : "outline"}
              onClick={() => setStatus(filter.id)}
            >
              {filter.label}
              {filter.id === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 rounded-full bg-background/20 px-1.5 text-xs">{pendingCount}</span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">A carregar…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          Sem pedidos nesta categoria.
        </div>
      ) : (
        <div className="divide-y rounded-lg border bg-card">
          {rows.map((receipt) => (
            <ReceiptRow key={receipt.id} receipt={receipt} />
          ))}
        </div>
      )}
    </section>
  );
}

function ReceiptRow({ receipt }: { receipt: AdminReceipt }) {
  const approve = useApproveReceipt();
  const [rejecting, setRejecting] = useState(false);
  const [zoom, setZoom] = useState(false);
  const name = receipt.profile?.display_name || receipt.profile?.email || "Cliente";

  async function onApprove() {
    try {
      const until = await approve.mutateAsync(receipt.id);
      toast.success(`Plano activado com sucesso para ${name} até ${dateLabel(until)}`);
    } catch (error) {
      toast.error(errorText(error, "Não foi possível aprovar."));
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        <div>
          <p className="text-xs text-muted-foreground">Número remetente</p>
          <p className="tnum break-all font-mono text-2xl font-bold">{receipt.payment_phone}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="max-w-full truncate font-medium">{name}</p>
          <Badge variant="secondary">{METHOD_LABEL[receipt.payment_method]}</Badge>
          <Badge variant="outline">
            {PLANS[receipt.plan].name} · {receipt.billing_cycle === "anual" ? "Anual" : "Mensal"}
          </Badge>
          <span className="tnum text-sm font-semibold">{money(receipt.amount)}</span>
        </div>
        <p className="break-all text-xs text-muted-foreground">
          {receipt.profile?.email ?? "—"} · {timeAgo(receipt.created_at)}
        </p>
        <a
          href={`https://wa.me/${waNumber(receipt.whatsapp_phone)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
        >
          <MessageCircle className="size-4" /> WhatsApp {receipt.whatsapp_phone}
        </a>
        {receipt.status === "rejected" && receipt.admin_notes && (
          <p className="text-xs text-destructive">Motivo: {receipt.admin_notes}</p>
        )}
        {receipt.status !== "pending" && receipt.reviewed_at && (
          <p className="text-xs text-muted-foreground">
            {receipt.status === "approved" ? "Aprovado" : "Recusado"} em {dateLabel(receipt.reviewed_at)}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
        {receipt.receipt_path && <ReceiptThumb path={receipt.receipt_path} onOpen={() => setZoom(true)} />}
        {receipt.status === "pending" && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setRejecting(true)} disabled={approve.isPending}>
              Recusar
            </Button>
            <Button size="sm" onClick={() => void onApprove()} disabled={approve.isPending}>
              {approve.isPending ? "A activar…" : "Aprovar e Ativar"}
            </Button>
          </div>
        )}
      </div>

      {receipt.receipt_path && <ZoomDialog open={zoom} onOpenChange={setZoom} path={receipt.receipt_path} />}
      <RejectDialog open={rejecting} onOpenChange={setRejecting} receiptId={receipt.id} name={name} />
    </div>
  );
}

function isPdf(path: string): boolean {
  return path.toLowerCase().endsWith(".pdf");
}

function ReceiptThumb({ path, onOpen }: { path: string; onOpen: () => void }) {
  const { data: url, isLoading } = useSignedReceiptUrl(path);
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onOpen}
      aria-label="Ver comprovativo"
      className={cn("size-20", !url && isLoading && "animate-pulse")}
    >
      {isPdf(path) ? (
        <span className="flex flex-col items-center gap-1 text-xs">
          <FileText className="size-6" /> PDF
        </span>
      ) : url ? (
        <img src={url} alt="Miniatura do comprovativo" className="size-full rounded-md object-cover" />
      ) : isLoading ? null : (
        "Sem pré-visualização"
      )}
    </Button>
  );
}

function ZoomDialog({
  open,
  onOpenChange,
  path,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  path: string;
}) {
  const { data: url } = useSignedReceiptUrl(open ? path : null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-auto">
        <DialogHeader>
          <DialogTitle>Comprovativo</DialogTitle>
          <DialogDescription>Ligação temporária — expira em poucos minutos.</DialogDescription>
        </DialogHeader>
        {!url ? (
          <p className="py-8 text-center text-sm text-muted-foreground">A carregar…</p>
        ) : isPdf(path) ? (
          <iframe src={url} title="Comprovativo em PDF" className="h-[70vh] w-full rounded-lg border" />
        ) : (
          <img
            src={url}
            alt="Comprovativo de pagamento"
            className="mx-auto max-h-[70vh] w-auto rounded-lg object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({
  open,
  onOpenChange,
  receiptId,
  name,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptId: string;
  name: string;
}) {
  const reject = useRejectReceipt();
  const [reason, setReason] = useState("");

  async function onConfirm() {
    const text = reason.trim();
    if (!text) {
      toast.error("Indique o motivo da recusa.");
      return;
    }
    try {
      await reject.mutateAsync({ id: receiptId, reason: text });
      toast.success("Pedido recusado. O cliente verá o motivo no ecrã de ativação.");
      setReason("");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorText(error, "Não foi possível recusar."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recusar pedido de {name}</DialogTitle>
          <DialogDescription>O motivo fica visível para o cliente.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {QUICK_REASONS.map((quickReason) => (
            <Button key={quickReason} type="button" size="sm" variant="outline" onClick={() => setReason(quickReason)}>
              {quickReason}
            </Button>
          ))}
        </div>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={300}
          rows={3}
          placeholder="Motivo da recusa"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={() => void onConfirm()} disabled={reject.isPending}>
            {reject.isPending ? "A recusar…" : "Recusar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}