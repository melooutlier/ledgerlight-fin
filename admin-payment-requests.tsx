import { useState } from "react";
import { FileText, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

function errorText(err: unknown, fallback: string): string {
  if (err && typeof err === "object") {
    const message = (err as { message?: unknown }).message;
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
        <h2 id="payment-requests-title" className="text-base font-semibold">Pedidos de Ativação e Comprovativos</h2>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <Button key={f.id} size="sm" variant={status === f.id ? "default" : "outline"} onClick={() => setStatus(f.id)}>
              {f.label}
              {f.id === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 rounded-full bg-background/20 px-1.5 text-xs">{pendingCount}</span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">A carregar…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">Sem pedidos nesta categoria.</div>
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {rows.map((r) => (
            <ReceiptRow key={r.id} receipt={r} />
          ))}
        </div>
      )}
    </section>
  );
}

function ReceiptRow({ receipt: r }: { receipt: AdminReceipt }) {
  const approve = useApproveReceipt();
  const [rejecting, setRejecting] = useState(false);
  const [zoom, setZoom] = useState(false);
  const name = r.profile?.display_name || r.profile?.email || "Cliente";

  async function onApprove() {
    try {
      const until = await approve.mutateAsync(r.id);
      toast.success(`Plano activado com sucesso para ${name} até ${dateLabel(until)}`);
    } catch (err) {
      toast.error(errorText(err, "Não foi possível aprovar."));
    }
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 p-4">
      <div className="min-w-0 space-y-2">
        <div>
          <p className="text-xs text-muted-foreground">Número remetente</p>
          <p className="tnum font-mono text-2xl font-bold tracking-wide">{r.payment_phone}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{name}</p>
          <Badge variant="secondary">{METHOD_LABEL[r.payment_method]}</Badge>
          <Badge variant="outline">{PLANS[r.plan].name} · {r.billing_cycle === "anual" ? "Anual" : "Mensal"}</Badge>
          <span className="tnum text-sm font-semibold">{money(r.amount)}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {r.profile?.email ?? "—"} · {timeAgo(r.created_at)}
        </p>
        <a
          href={`https://wa.me/${waNumber(r.whatsapp_phone)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-green-700 underline-offset-4 hover:underline dark:text-green-400"
        >
          <MessageCircle className="size-4" /> WhatsApp {r.whatsapp_phone}
        </a>
        {r.status === "rejected" && r.admin_notes && (
          <p className="text-xs text-destructive">Motivo: {r.admin_notes}</p>
        )}
        {r.status !== "pending" && r.reviewed_at && (
          <p className="text-xs text-muted-foreground">
            {r.status === "approved" ? "Aprovado" : "Recusado"} em {dateLabel(r.reviewed_at)}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-3">
        {r.receipt_path && <ReceiptThumb path={r.receipt_path} onOpen={() => setZoom(true)} />}
        {r.status === "pending" && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setRejecting(true)} disabled={approve.isPending}>Recusar</Button>
            <Button size="sm" onClick={onApprove} disabled={approve.isPending}>
              {approve.isPending ? "A activar…" : "Aprovar e Ativar"}
            </Button>
          </div>
        )}
      </div>

      {r.receipt_path && <ZoomDialog open={zoom} onOpenChange={setZoom} path={r.receipt_path} />}
      <RejectDialog open={rejecting} onOpenChange={setRejecting} receiptId={r.id} name={name} />
    </div>
  );
}

function isPdf(path: string) {
  return path.toLowerCase().endsWith(".pdf");
}

function ReceiptThumb({ path, onOpen }: { path: string; onOpen: () => void }) {
  const { data: url, isLoading } = useSignedReceiptUrl(path);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Ver comprovativo"
      className={cn("grid size-20 place-items-center overflow-hidden rounded-lg border bg-muted text-xs text-muted-foreground", !url && "animate-pulse")}
    >
      {isPdf(path) ? (
        <span className="flex flex-col items-center gap-1"><FileText className="size-6" />PDF</span>
      ) : url ? (
        <img src={url} alt="Miniatura do comprovativo" className="size-full object-cover" />
      ) : isLoading ? null : (
        "Sem pré-visualização"
      )}
    </button>
  );
}

function ZoomDialog({ open, onOpenChange, path }: { open: boolean; onOpenChange: (o: boolean) => void; path: string }) {
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
          <img src={url} alt="Comprovativo de pagamento" className="mx-auto max-h-[70vh] w-auto rounded-lg object-contain" />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ open, onOpenChange, receiptId, name }: { open: boolean; onOpenChange: (o: boolean) => void; receiptId: string; name: string }) {
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
    } catch (err) {
      toast.error(errorText(err, "Não foi possível recusar."));
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
          {QUICK_REASONS.map((q) => (
            <Button key={q} type="button" size="sm" variant="outline" onClick={() => setReason(q)}>{q}</Button>
          ))}
        </div>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} rows={3} placeholder="Motivo da recusa" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={reject.isPending}>
            {reject.isPending ? "A recusar…" : "Recusar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
