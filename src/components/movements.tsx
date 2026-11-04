import { UpgradeButton } from "@/components/upgrade-notice";
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
import { emojiFor } from "@/lib/emoji";
import { Switch } from "@/components/ui/switch";
import { Camera, Plus } from "lucide-react";
import { todayISO, num, money } from "@/lib/format";
import {
  useAddLoanPayment,
  useAdvances,
  useCategories,
  useLoanPayments,
  useSaveAdvance,
  useSaveLoan,
  useSaveTransaction,
  useSaveCategory,
  useAccounts,
  usePlan,
  uploadReceipt,
  ACCOUNT_TYPES,
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
  const [txState, setTxState] = useState<{ open: boolean; type: TxType; tx?: Transaction | undefined }>({
    open: false,
    type: "expense",
  });
  const [loanState, setLoanState] = useState<{ open: boolean; loan?: Loan | undefined }>({ open: false });
  const [advState, setAdvState] = useState<{ open: boolean; advance?: Advance | undefined }>({ open: false });
  const [payState, setPayState] = useState<{ open: boolean; loan?: Loan | undefined }>({ open: false });

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
  state: { open: boolean; type: TxType; tx?: Transaction | undefined };
  onClose: () => void;
}) {
  const { data: categories = [] } = useCategories();
  const { data: advances = [] } = useAdvances();
  const save = useSaveTransaction();
  const saveCategory = useSaveCategory();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const tx = state.tx;
  const type = tx?.type === "income" || tx?.type === "expense" ? (tx.type as TxType) : state.type;

  const [amount, setAmount] = useState(tx ? String(num(tx.amount)) : "");
  const [description, setDescription] = useState(tx?.description ?? "");
  const [date, setDate] = useState(tx?.tx_date ?? todayISO());
  const [categoryId, setCategoryId] = useState(tx?.category_id ?? NONE);
  const [method, setMethod] = useState(tx?.method ?? NONE);
  const [notes, setNotes] = useState(tx?.notes ?? "");
  const [advanceId, setAdvanceId] = useState(tx?.advance_id ?? NONE);
  const [accountId, setAccountId] = useState(tx?.account_id ?? NONE);
  const [confirmed, setConfirmed] = useState(tx?.confirmed ?? true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const catLabel = categories.find((c) => c.id === categoryId)?.name;

  const options = categories.filter((c) => c.kind === type);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Indique um valor válido.");
      return;
    }
    try {
      setUploading(true);
      const image_path = file ? await uploadReceipt(file) : (tx?.image_path ?? null);
      await save.mutateAsync({
        id: tx?.id,
        type,
        account_id: accountId === NONE ? null : accountId,
        confirmed,
        image_path,
        description: description.trim() || (type === "expense" ? "Despesa" : "Receita"),
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
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="transaction-form-dialog sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {tx ? "Editar" : "Nova"} {type === "expense" ? "despesa" : "receita"}
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
            <div className="flex items-center justify-between gap-2">
              <Label>Categoria</Label>
              <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5 px-2 text-primary" onClick={() => { setNewCategoryName(""); setCategoryDialogOpen(true); }}>
                <Plus className="size-3.5" /> Criar categoria
              </Button>
            </div>
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
            <div className="flex items-center gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg" aria-hidden>
              {emojiFor(description, catLabel, type)}
            </span>
            <Input
              id="description"
              value={description}
              maxLength={120}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === "expense" ? "Ex.: Hambúrguer" : "Ex.: Salário"}
            />
            </div>
          </div>
          <AccountSelect value={accountId} onChange={setAccountId} />
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">{type === "expense" ? "Pagamento confirmado" : "Dinheiro recebido"}</p>
              <p className="text-xs text-muted-foreground">Desligue se ainda estiver por {type === "expense" ? "pagar" : "receber"}.</p>
            </div>
            <Switch checked={confirmed} onCheckedChange={setConfirmed} />
          </div>
          <PhotoPicker file={file} onFile={setFile} existing={tx?.image_path} />
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
            <Button type="submit" disabled={save.isPending || uploading}>
              {uploading ? "A enviar…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova categoria de {type === "expense" ? "despesa" : "receita"}</DialogTitle>
          <DialogDescription>
            A categoria ficará disponível nesta movimentação e na página Categorias.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const name = newCategoryName.trim();
            if (!name) return;
            if (categories.some((category) => category.kind === type && category.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) {
              toast.error("Já existe uma categoria com esse nome.");
              return;
            }
            try {
              const createdCategoryId = await saveCategory.mutateAsync({ name, kind: type });
              setCategoryId(createdCategoryId);
              toast.success("Categoria criada e selecionada.");
              setCategoryDialogOpen(false);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Não foi possível criar a categoria.");
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="quick-category-name">Nome da categoria</Label>
            <Input id="quick-category-name" autoFocus maxLength={60} value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder={type === "expense" ? "Ex.: Saúde" : "Ex.: Comissão"} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setCategoryDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={!newCategoryName.trim() || saveCategory.isPending}>
              {saveCategory.isPending ? "A guardar…" : "Guardar categoria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}

function LoanDialog({
  state,
  onClose,
}: {
  state: { open: boolean; loan?: Loan | undefined };
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
    if (!person.trim()) { toast.error("Indique o nome da pessoa."); return; }
    if (!Number.isFinite(value) || value <= 0) { toast.error("Indique um valor válido."); return; }
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
  state: { open: boolean; advance?: Advance | undefined };
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
    if (!purpose.trim()) { toast.error("Indique a finalidade."); return; }
    if (!Number.isFinite(value) || value <= 0) { toast.error("Indique um valor válido."); return; }
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
  state: { open: boolean; loan?: Loan | undefined };
  onClose: () => void;
}) {
  const add = useAddLoanPayment();
  const { data: payments = [] } = useLoanPayments();
  const loan = state.loan;
  const summary = loan ? loanSummary(loan, payments) : null;
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [accountId, setAccountId] = useState(NONE);
  const [file, setFile] = useState<File | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!loan) return;
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) { toast.error("Indique um valor válido."); return; }
    try {
      await add.mutateAsync({
        loan_id: loan.id,
        amount: value,
        paid_at: date,
        notes: notes.trim() || null,
        account_id: accountId === NONE ? null : accountId,
        image_path: file ? await uploadReceipt(file) : null,
      });
      toast.success("Recebimento confirmado. ✅");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível guardar.");
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmar recebimento</DialogTitle>
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
          <AccountSelect value={accountId} onChange={setAccountId} />
          <PhotoPicker file={file} onFile={setFile} />
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

function AccountSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: accounts = [] } = useAccounts();
  if (accounts.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <Label>Conta / carteira</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Escolher conta" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Não indicar</SelectItem>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {ACCOUNT_TYPES[a.type]?.emoji ?? "👛"} {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PhotoPicker({ file, onFile, existing }: { file: File | null; onFile: (f: File | null) => void; existing?: string | null | undefined }) {
  const { can } = usePlan();
  if (!can("photos")) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
        <span>🔒 Fotos de comprovativos: actualize para o plano Pessoal Avançado.</span>
        <UpgradeButton size="sm" variant="outline">Upgrade</UpgradeButton>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <Label htmlFor="photo" className="flex items-center gap-2">
        <Camera className="size-4" /> Foto do comprovativo ou da compra
      </Label>
      <Input id="photo" type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      {!file && existing && <p className="text-xs text-muted-foreground">Já tem uma foto anexada. Escolha outra para substituir.</p>}
    </div>
  );
}
