import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPENSE_METHODS } from "@/lib/period";
import { todayISO, num, money } from "@/lib/format";
import {
  useAddLoanPayment,
  useAdvances,
  useCategories,
  useLoanPayments,
  useSaveAdvance,
  useSaveLoan,
  useSaveTransaction,
  loanSummary,
  type Advance,
  type Loan,
  type Transaction,
} from "@/lib/data";

type TxType = "income" | "expense";

type Ctx = {
  openTransaction: (type: TxType, tx?: Transaction) => void;
  openLoan: (loan?: Loan) => void;
  openAdvance: (advance?: Advance) => void;
  openPayment: (loan: Loan) => void;
};

const MovementsContext = createContext<Ctx | null>(null);

export function useMovements(): Ctx {
  const ctx = useContext(MovementsContext);
  if (!ctx) throw new Error("useMovements deve ser usado dentro de MovementsProvider");
  return ctx;
}

export function MovementsProvider({ children }: { children: ReactNode }) {
  const [txState, setTxState] = useState<{ open: boolean; type: TxType; tx?: Transaction }>({
    open: false,
    type: "expense",
  });
  const [loanState, setLoanState] = useState<{ open: boolean; loan?: Loan }>({ open: false });
  const [advState, setAdvState] = useState<{ open: boolean; advance?: Advance }>({ open: false });
  const [payState, setPayState] = useState<{ open: boolean; loan?: Loan }>({ open: false });

  const value = useMemo<Ctx>(
    () => ({
      openTransaction: (type, tx) => setTxState({ open: true, type, tx }),
      openLoan: (loan) => setLoanState({ open: true, loan }),
      openAdvance: (advance) => setAdvState({ open: true, advance }),
      openPayment: (loan) => setPayState({ open: true, loan }),
    }),
    [],
  );

  return (
    <MovementsContext.Provider value={value}>
      {children}
      <TransactionDialog
        key={`tx-${txState.tx?.id ?? txState.type}-${String(txState.open)}`}
        state={txState}
        onClose={() => setTxState((s) => ({ ...s, open: false }))}
      />
      <LoanDialog
        key={`loan-${loanState.loan?.id ?? "new"}-${String(loanState.open)}`}
        state={loanState}
        onClose={() => setLoanState({ open: false })}
      />
      <AdvanceDialog
        key={`adv-${advState.advance?.id ?? "new"}-${String(advState.open)}`}
        state={advState}
        onClose={() => setAdvState({ open: false })}
      />
      <PaymentDialog
        key={`pay-${payState.loan?.id ?? "new"}-${String(payState.open)}`}
        state={payState}
        onClose={() => setPayState({ open: false })}
      />
    </MovementsContext.Provider>
  );
}

const NONE = "__none__";

function TransactionDialog({
  state,
  onClose,
}: {
  state: { open: boolean; type: TxType; tx?: Transaction };
  onClose: () => void;
}) {
  const { data: categories = [] } = useCategories();
  const { data: advances = [] } = useAdvances();
  const save = useSaveTransaction();
  const tx = state.tx;
  const type = tx?.type === "income" || tx?.type === "expense" ? (tx.type as TxType) : state.type;

  const [amount, setAmount] = useState(tx ? String(num(tx.amount)) : "");
  const [description, setDescription] = useState(tx?.description ?? "");
  const [date, setDate] = useState(tx?.tx_date ?? todayISO());
  const [categoryId, setCategoryId] = useState(tx?.category_id ?? NONE);
  const [method, setMethod] = useState(tx?.method ?? NONE);
  const [notes, setNotes] = useState(tx?.notes ?? "");
  const [advanceId, setAdvanceId] = useState(tx?.advance_id ?? NONE);

  const options = categories.filter((c) => c.kind === type);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Indique um valor válido.");
      return;
    }
    try {
      await save.mutateAsync({
        id: tx?.id,
        type,
        description: description.trim() || (type === "expense" ? "Despesa" : "Entrada"),
        amount: value,
        tx_date: date,
        category_id: categoryId === NONE ? null : categoryId,
        method: method === NONE ? null : method,
        notes: notes.trim() || null,
        advance_id: type === "expense" && advanceId !== NONE ? advanceId : null,
      });
      toast.success(tx ? "Movimentação actualizada." : "Movimentação registada.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível guardar.");
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {tx ? "Editar" : "Nova"} {type === "expense" ? "despesa" : "entrada"}
          </DialogTitle>
          <DialogDescription>
            Valor e categoria são o essencial. O resto é opcional.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Valor (MT)</Label>
            <Input
              id="amount"
              inputMode="decimal"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="tnum text-2xl font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolher categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem categoria</SelectItem>
                {options.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Método</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não indicar</SelectItem>
                  {EXPENSE_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={description}
              maxLength={120}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === "expense" ? "Ex.: Compras do mês" : "Ex.: Salário"}
            />
          </div>
          {type === "expense" && advances.length > 0 && (
            <div className="space-y-1.5">
              <Label>Adiantamento pessoal (opcional)</Label>
              <Select value={advanceId} onValueChange={setAdvanceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Nenhum</SelectItem>
                  {advances.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.purpose} — {money(a.amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Observação</Label>
            <Textarea
              id="notes"
              value={notes}
              maxLength={500}
              rows={2}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LoanDialog({
  state,
  onClose,
}: {
  state: { open: boolean; loan?: Loan };
  onClose: () => void;
}) {
  const save = useSaveLoan();
  const loan = state.loan;
  const [person, setPerson] = useState(loan?.person_name ?? "");
  const [amount, setAmount] = useState(loan ? String(num(loan.amount)) : "");
  const [loanDate, setLoanDate] = useState(loan?.loan_date ?? todayISO());
  const [dueDate, setDueDate] = useState(loan?.due_date ?? "");
  const [reason, setReason] = useState(loan?.reason ?? "");
  const [notes, setNotes] = useState(loan?.notes ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(",", "."));
    if (!person.trim()) return toast.error("Indique o nome da pessoa.");
    if (!Number.isFinite(value) || value <= 0) return toast.error("Indique um valor válido.");
    try {
      await save.mutateAsync({
        id: loan?.id,
        person_name: person.trim(),
        amount: value,
        loan_date: loanDate,
        due_date: dueDate || null,
        reason: reason.trim() || null,
        notes: notes.trim() || null,
      });
      toast.success(loan ? "Empréstimo actualizado." : "Empréstimo registado.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível guardar.");
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{loan ? "Editar empréstimo" : "Novo empréstimo"}</DialogTitle>
          <DialogDescription>Dinheiro que emprestou a outra pessoa.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="person">Nome da pessoa</Label>
            <Input
              id="person"
              value={person}
              maxLength={80}
              autoFocus
              onChange={(e) => setPerson(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loan-amount">Valor emprestado (MT)</Label>
            <Input
              id="loan-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="tnum text-xl font-semibold"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="loan-date">Data</Label>
              <Input
                id="loan-date"
                type="date"
                value={loanDate}
                onChange={(e) => setLoanDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due-date">Previsão de pagamento</Label>
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Motivo</Label>
            <Input
              id="reason"
              value={reason}
              maxLength={120}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loan-notes">Observação</Label>
            <Textarea
              id="loan-notes"
              rows={2}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdvanceDialog({
  state,
  onClose,
}: {
  state: { open: boolean; advance?: Advance };
  onClose: () => void;
}) {
  const save = useSaveAdvance();
  const advance = state.advance;
  const [purpose, setPurpose] = useState(advance?.purpose ?? "");
  const [amount, setAmount] = useState(advance ? String(num(advance.amount)) : "");
  const [date, setDate] = useState(advance?.advance_date ?? todayISO());
  const [notes, setNotes] = useState(advance?.notes ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(",", "."));
    if (!purpose.trim()) return toast.error("Indique a finalidade.");
    if (!Number.isFinite(value) || value <= 0) return toast.error("Indique um valor válido.");
    try {
      await save.mutateAsync({
        id: advance?.id,
        purpose: purpose.trim(),
        amount: value,
        advance_date: date,
        notes: notes.trim() || null,
      });
      toast.success(advance ? "Adiantamento actualizado." : "Adiantamento criado.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível guardar.");
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{advance ? "Editar adiantamento" : "Novo adiantamento pessoal"}</DialogTitle>
          <DialogDescription>
            Dinheiro reservado do seu próprio orçamento. Só conta como despesa quando registar onde
            foi gasto.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="purpose">Finalidade</Label>
            <Input
              id="purpose"
              autoFocus
              maxLength={120}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Ex.: Comprar equipamento"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adv-amount">Valor (MT)</Label>
            <Input
              id="adv-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="tnum text-xl font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adv-date">Data</Label>
            <Input
              id="adv-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adv-notes">Observações</Label>
            <Textarea
              id="adv-notes"
              rows={2}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({
  state,
  onClose,
}: {
  state: { open: boolean; loan?: Loan };
  onClose: () => void;
}) {
  const add = useAddLoanPayment();
  const { data: payments = [] } = useLoanPayments();
  const loan = state.loan;
  const summary = loan ? loanSummary(loan, payments) : null;
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!loan) return;
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return toast.error("Indique um valor válido.");
    try {
      await add.mutateAsync({
        loan_id: loan.id,
        amount: value,
        paid_at: date,
        notes: notes.trim() || null,
      });
      toast.success("Pagamento registado.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível guardar.");
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registar pagamento</DialogTitle>
          <DialogDescription>
            {loan?.person_name}
            {summary ? ` — falta ${money(summary.pending)}` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pay-amount">Valor recebido (MT)</Label>
            <Input
              id="pay-amount"
              autoFocus
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="tnum text-xl font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-date">Data</Label>
            <Input
              id="pay-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-notes">Observação</Label>
            <Input
              id="pay-notes"
              maxLength={200}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={add.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
