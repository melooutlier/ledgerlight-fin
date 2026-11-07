import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { PAYMENT, PLANS, type PlanId } from "@/lib/plans";

export type BillingCycle = "mensal" | "anual";
export type PaymentMethod = "mpesa" | "emola" | "millennium_bim";
export type ReceiptStatus = "pending" | "approved" | "rejected";

export interface PaymentReceipt {
  id: string;
  user_id: string;
  plan: PlanId;
  billing_cycle: BillingCycle;
  amount: number;
  payment_method: PaymentMethod;
  payment_phone: string;
  whatsapp_phone: string;
  receipt_path: string | null;
  status: ReceiptStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface AdminReceipt extends PaymentReceipt {
  profile: { display_name: string | null; email: string | null } | null;
}

const db = supabase as unknown as SupabaseClient;

export const METHODS: PaymentMethod[] = ["mpesa", "emola", "millennium_bim"];

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  mpesa: "M-Pesa",
  emola: "e-Mola",
  millennium_bim: "Millennium BIM",
};

export const ACCEPTED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function isMzMobile(value: string): boolean {
  return /^8[4-7]\d{7}$/.test(digitsOnly(value));
}

export function isWhatsappValid(value: string): boolean {
  const digits = digitsOnly(value);
  return digits.length >= 9 && digits.length <= 15;
}

export function planAmount(plan: PlanId, cycle: BillingCycle): number {
  return cycle === "anual" ? PLANS[plan].yearly : PLANS[plan].price;
}

export function waNumber(value: string): string {
  return digitsOnly(value);
}

export function adminWhatsappUrl(receipt: PaymentReceipt, email: string): string {
  const message = [
    "Olá, submeti uma confirmação de pagamento no Melfy.",
    `Email: ${email || "não indicado"}`,
    `Plano: ${PLANS[receipt.plan].name} (${receipt.billing_cycle})`,
    `Valor: ${receipt.amount} MT`,
    `Método: ${METHOD_LABEL[receipt.payment_method]}`,
    `Número de envio: ${receipt.payment_phone}`,
    `WhatsApp: ${receipt.whatsapp_phone}`,
  ].join("\n");
  return `https://wa.me/${waNumber(PAYMENT.contact)}?text=${encodeURIComponent(message)}`;
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Sessão expirada. Inicie sessão novamente.");
  return data.user.id;
}

function invalidatePaymentQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["my-payment-receipts"] });
  void queryClient.invalidateQueries({ queryKey: ["admin-payment-receipts"] });
  void queryClient.invalidateQueries({ queryKey: ["pending-payment-receipt-count"] });
  void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  void queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
}

export function useMyReceipts() {
  return useQuery({
    queryKey: ["my-payment-receipts"],
    queryFn: async (): Promise<PaymentReceipt[]> => {
      const userId = await currentUserId();
      const { data, error } = await db
        .from("payment_receipts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PaymentReceipt[];
    },
  });
}

export interface SubmitReceiptInput {
  plan: PlanId;
  billing_cycle: BillingCycle;
  payment_method: PaymentMethod;
  payment_phone: string;
  whatsapp_phone: string;
  file: File | null;
}

export function useSubmitReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitReceiptInput) => {
      const userId = await currentUserId();
      let receiptPath: string | null = null;

      if (input.file) {
        const extension = input.file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
        receiptPath = `subscriptions/${userId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(receiptPath, input.file, { contentType: input.file.type, upsert: false });
        if (uploadError) throw uploadError;
      }

      const { error } = await db.from("payment_receipts").insert({
        user_id: userId,
        plan: input.plan,
        billing_cycle: input.billing_cycle,
        amount: planAmount(input.plan, input.billing_cycle),
        payment_method: input.payment_method,
        payment_phone: digitsOnly(input.payment_phone),
        whatsapp_phone: digitsOnly(input.whatsapp_phone),
        receipt_path: receiptPath,
      });

      if (error) {
        if (receiptPath) await supabase.storage.from("receipts").remove([receiptPath]);
        throw error;
      }
    },
    onSuccess: () => invalidatePaymentQueries(queryClient),
  });
}

export function useAdminReceipts(status: ReceiptStatus) {
  return useQuery({
    queryKey: ["admin-payment-receipts", status],
    queryFn: async (): Promise<AdminReceipt[]> => {
      const { data, error } = await db
        .from("payment_receipts")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const receipts = (data ?? []) as PaymentReceipt[];
      if (receipts.length === 0) return [];

      const userIds = [...new Set(receipts.map((receipt) => receipt.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds);
      if (profilesError) throw profilesError;

      const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile] as const));
      return receipts.map((receipt) => ({
        ...receipt,
        profile: profileById.get(receipt.user_id) ?? null,
      }));
    },
  });
}

export function usePendingReceiptCount() {
  return useQuery({
    queryKey: ["pending-payment-receipt-count"],
    queryFn: async () => {
      const { count, error } = await db
        .from("payment_receipts")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useApproveReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (receiptId: string): Promise<string> => {
      const { data, error } = await db.rpc("approve_payment_receipt", { _receipt_id: receiptId });
      if (error) throw error;
      return String(data);
    },
    onSuccess: () => invalidatePaymentQueries(queryClient),
  });
}

export function useRejectReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; reason: string }) => {
      const { error } = await db.rpc("reject_payment_receipt", {
        _receipt_id: input.id,
        _reason: input.reason,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidatePaymentQueries(queryClient),
  });
}

export function useSignedReceiptUrl(path: string | null) {
  return useQuery({
    queryKey: ["signed-payment-receipt", path],
    enabled: !!path,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 10 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function timeAgo(value: string): string {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("pt-PT", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}