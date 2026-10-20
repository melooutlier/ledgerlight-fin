import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { num, todayISO } from "./format";
import { effectivePlan, hasFeature, ACCOUNT_LIMIT, type Feature, type PlanId } from "./plans";

export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type Loan = Database["public"]["Tables"]["loans"]["Row"];
export type LoanPayment = Database["public"]["Tables"]["loan_payments"]["Row"];
export type Advance = Database["public"]["Tables"]["personal_advances"]["Row"];
export type Budget = Database["public"]["Tables"]["budgets"]["Row"];
export type BudgetCategory = Database["public"]["Tables"]["budget_categories"]["Row"];
export type Account = Database["public"]["Tables"]["accounts"]["Row"];
export type SavingsGoal = Database["public"]["Tables"]["savings_goals"]["Row"];
export type HouseholdBill = Database["public"]["Tables"]["household_bills"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

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
  account_id?: string | null;
  image_path?: string | null;
  confirmed?: boolean;
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

export function useDeleteRow(
  table: "transactions" | "loans" | "personal_advances" | "categories" | "accounts" | "savings_goals" | "household_bills",
) {
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
    mutationFn: async (input: {
      loan_id: string;
      amount: number;
      paid_at: string;
      notes: string | null;
      account_id?: string | null;
      image_path?: string | null;
    }) => {
      const user_id = await uid();
      const { error } = await supabase.from("loan_payments").insert({ ...input, user_id });
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
    mutationFn: async (input: { id?: string | undefined; name: string; kind: "income" | "expense" }): Promise<string> => {
      const user_id = await uid();
      if (input.id) {
        const { error } = await supabase
          .from("categories")
          .update({ name: input.name, kind: input.kind })
          .eq("id", input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase
        .from("categories")
        .insert({ name: input.name, kind: input.kind, user_id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
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


/* ---------- accounts, savings, household, plans ---------- */

function listQuery<T>(key: string, table: "accounts" | "savings_goals" | "household_bills") {
  return {
    queryKey: [key],
    queryFn: async (): Promise<T[]> => {
      const { data, error } = await supabase.from(table).select("*").order("created_at");
      if (error) throw error;
      return (data ?? []) as T[];
    },
  };
}

export const useAccounts = () => useQuery(listQuery<Account>("accounts", "accounts"));
export const useSavingsGoals = () => useQuery(listQuery<SavingsGoal>("savings_goals", "savings_goals"));
export const useHouseholdBills = () => useQuery(listQuery<HouseholdBill>("household_bills", "household_bills"));

export const ACCOUNT_TYPES: Record<string, { label: string; emoji: string }> = {
  mpesa: { label: "M-Pesa", emoji: "📲" },
  emola: { label: "e-Mola", emoji: "📱" },
  mkesh: { label: "mKesh", emoji: "📳" },
  banco: { label: "Banco", emoji: "🏦" },
  dinheiro: { label: "Dinheiro", emoji: "💵" },
  outra: { label: "Outra", emoji: "👛" },
};

export function useSaveAccount() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: { id?: string | undefined; name: string; type: string; initial_balance: number; is_savings: boolean; institution?: string; account_number?: string | null; account_color?: string; account_icon?: string }) => {
      const user_id = await uid();
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("accounts").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("accounts").insert({ ...stripId(input), user_id });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });
}

export function useTransfer() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: { from: string; to: string; amount: number; date: string; description: string }) => {
      const user_id = await uid();
      const group = crypto.randomUUID();
      const base = { user_id, amount: input.amount, tx_date: input.date, description: input.description, transfer_group: group };
      const { error } = await supabase.from("transactions").insert([
        { ...base, type: "transfer_out", account_id: input.from },
        { ...base, type: "transfer_in", account_id: input.to },
      ]);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Balance per account: initial + confirmed income/transfers in − confirmed expenses/transfers out + loan payments received. */
export function accountBalances(accounts: Account[], txs: Transaction[], payments: LoanPayment[]) {
  const map = new Map<string, number>(accounts.map((a) => [a.id, num(a.initial_balance)]));
  for (const t of txs) {
    if (!t.account_id || !map.has(t.account_id) || !t.confirmed) continue;
    const sign = t.type === "income" || t.type === "transfer_in" ? 1 : -1;
    map.set(t.account_id, (map.get(t.account_id) ?? 0) + sign * num(t.amount));
  }
  for (const p of payments) {
    if (p.account_id && map.has(p.account_id)) map.set(p.account_id, (map.get(p.account_id) ?? 0) + num(p.amount));
  }
  return map;
}

export function useSaveGoal() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: {
      id?: string | undefined;
      name: string;
      emoji: string;
      target_amount: number;
      saved_amount: number;
      target_date: string | null;
      account_id: string | null;
    }) => {
      const user_id = await uid();
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("savings_goals").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("savings_goals").insert({ ...stripId(input), user_id });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });
}

export function useSaveBill() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (input: {
      id?: string | undefined;
      name: string;
      emoji: string;
      amount: number;
      due_day: number;
      member: string | null;
      last_paid_month?: string | null;
    }) => {
      const user_id = await uid();
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("household_bills").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("household_bills").insert({ ...stripId(input), user_id });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });
}

/* ---------- receipts (photos) ---------- */

export async function uploadReceipt(file: File): Promise<string> {
  const user_id = await uid();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${user_id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("receipts").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

export function useReceiptUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["receipt", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

/* ---------- plan & roles ---------- */

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const user_id = await uid();
      const { data } = await supabase.rpc("has_role", { _user_id: user_id, _role: "admin" });
      return data === true;
    },
  });
}

export function usePlan() {
  const admin = useIsAdmin();
  const sub = useQuery({
    queryKey: ["my-subscription"],
    queryFn: async () => {
      const user_id = await uid();
      const { data } = await supabase.from("subscriptions").select("*").eq("user_id", user_id).maybeSingle();
      return data;
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
  const plan: PlanId = admin.data ? "avancado" : effectivePlan(sub.data, todayISO());
  return {
    plan,
    subscription: sub.data,
    isAdmin: admin.data === true,
    can: (f: Feature) => hasFeature(plan, f),
    accountLimit: ACCOUNT_LIMIT[plan],
    isLoading: sub.isLoading || admin.isLoading,
  };
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles, error: e1 }, { data: subs, error: e2 }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("*"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const byUser = new Map((subs ?? []).map((s) => [s.user_id, s] as const));
      return (profiles ?? []).map((p) => ({ profile: p, sub: byUser.get(p.id) ?? null }));
    },
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { user_id: string; plan: string; status: string; expires_at: string | null }) => {
      const { user_id, ...rest } = input;
      const { error } = await supabase.from("subscriptions").update(rest).eq("user_id", user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      void qc.invalidateQueries({ queryKey: ["my-subscription"] });
    },
  });
}
