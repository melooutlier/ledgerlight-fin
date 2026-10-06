import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { num } from "./format";

export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type Loan = Database["public"]["Tables"]["loans"]["Row"];
export type LoanPayment = Database["public"]["Tables"]["loan_payments"]["Row"];
export type Advance = Database["public"]["Tables"]["personal_advances"]["Row"];
export type Budget = Database["public"]["Tables"]["budgets"]["Row"];
export type BudgetCategory = Database["public"]["Tables"]["budget_categories"]["Row"];

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sessão expirada. Inicie sessão novamente.");
  return data.user.id;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("tx_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLoans() {
  return useQuery({
    queryKey: ["loans"],
    queryFn: async (): Promise<Loan[]> => {
      const { data, error } = await supabase
        .from("loans")
        .select("*")
        .order("loan_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLoanPayments() {
  return useQuery({
    queryKey: ["loan_payments"],
    queryFn: async (): Promise<LoanPayment[]> => {
      const { data, error } = await supabase
        .from("loan_payments")
        .select("*")
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdvances() {
  return useQuery({
    queryKey: ["advances"],
    queryFn: async (): Promise<Advance[]> => {
      const { data, error } = await supabase
        .from("personal_advances")
        .select("*")
        .order("advance_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBudgets() {
  return useQuery({
    queryKey: ["budgets"],
    queryFn: async (): Promise<Budget[]> => {
      const { data, error } = await supabase.from("budgets").select("*").order("month");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBudgetCategories() {
  return useQuery({
    queryKey: ["budget_categories"],
    queryFn: async (): Promise<BudgetCategory[]> => {
      const { data, error } = await supabase.from("budget_categories").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries();
  };
}

type TxInput = {
  id?: string | undefined;
  type: "income" | "expense";
  description: string;
  amount: number;
  tx_date: string;
  category_id: string | null;
  method: string | null;
  notes: string | null;
  advance_id?: string | null;
};

export function useSaveTransaction() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: TxInput) => {
      const user_id = await uid();
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("transactions").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("transactions").insert({ ...stripId(input), user_id });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });
}

export function useDeleteRow(table: "transactions" | "loans" | "personal_advances" | "categories") {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

type LoanInput = {
  id?: string | undefined;
  person_name: string;
  amount: number;
  loan_date: string;
  due_date: string | null;
  reason: string | null;
  notes: string | null;
};

export function useSaveLoan() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: LoanInput) => {
      const user_id = await uid();
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("loans").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("loans").insert({ ...stripId(input), user_id });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });
}

export function useAddLoanPayment() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: { loan_id: string; amount: number; paid_at: string; notes: string | null }) => {
      const user_id = await uid();
      const { error } = await supabase.from("loan_payments").insert({ ...stripId(input), user_id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteLoanPayment() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("loan_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

type AdvanceInput = {
  id?: string | undefined;
  purpose: string;
  amount: number;
  advance_date: string;
  notes: string | null;
};

export function useSaveAdvance() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: AdvanceInput) => {
      const user_id = await uid();
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("personal_advances").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("personal_advances").insert({ ...stripId(input), user_id });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });
}

export function useSaveCategory() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: { id?: string | undefined; name: string; kind: "income" | "expense" }) => {
      const user_id = await uid();
      if (input.id) {
        const { error } = await supabase
          .from("categories")
          .update({ name: input.name, kind: input.kind })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("categories")
          .insert({ name: input.name, kind: input.kind, user_id });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });
}

export function useSaveBudget() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: { month: string; total_amount: number }) => {
      const user_id = await uid();
      const { error } = await supabase
        .from("budgets")
        .upsert({ ...input, user_id }, { onConflict: "user_id,month" });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSaveBudgetCategory() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: { budget_id: string; category_id: string; limit_amount: number }) => {
      const user_id = await uid();
      const { error } = await supabase
        .from("budget_categories")
        .upsert({ ...input, user_id }, { onConflict: "budget_id,category_id" });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteBudgetCategory() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budget_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useClearDemoData() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async () => {
      await supabase.from("loan_payments").delete().eq("is_demo", true);
      await supabase.from("transactions").delete().eq("is_demo", true);
      await supabase.from("loans").delete().eq("is_demo", true);
      await supabase.from("personal_advances").delete().eq("is_demo", true);
    },
    onSuccess: invalidate,
  });
}

/* ---------- derived helpers ---------- */

export type LoanStatus = "Pendente" | "Parcial" | "Pago" | "Atrasado";

export function loanSummary(loan: Loan, payments: LoanPayment[]) {
  const paid = payments
    .filter((p) => p.loan_id === loan.id)
    .reduce((s, p) => s + num(p.amount), 0);
  const total = num(loan.amount);
  const pending = Math.max(total - paid, 0);
  const today = new Date().toISOString().slice(0, 10);
  let status: LoanStatus = "Pendente";
  if (pending <= 0) status = "Pago";
  else if (loan.due_date && loan.due_date < today) status = "Atrasado";
  else if (paid > 0) status = "Parcial";
  return { paid, pending, total, status };
}

export function advanceSummary(advance: Advance, transactions: Transaction[]) {
  const used = transactions
    .filter((t) => t.advance_id === advance.id && t.type === "expense")
    .reduce((s, t) => s + num(t.amount), 0);
  const total = num(advance.amount);
  return { used, total, remaining: Math.max(total - used, 0) };
}

function stripId<T extends { id?: string | undefined }>(input: T): Omit<T, "id"> {
  const { id: _id, ...rest } = input;
  return rest;
}
