import { cn } from "@/lib/utils";

export function MelfyBrand({ className }: { className?: string }) {
  return <span className={cn("inline-flex items-center gap-2.5 text-2xl font-extrabold", className)}><svg className="size-8 text-primary" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M4 25V12L11 6L16 15L21 6L28 12V25" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>Melfy<span className="text-primary">.</span></span>;
}