import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtMoney, usePrivacy } from "@/lib/privacy";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: number;
  hint?: string | undefined;
  icon?: LucideIcon;
  tone?: "neutral" | "positive" | "negative" | "accent";
}) {
  const hidden = usePrivacy();
  const toneClass =
    tone === "positive"
      ? "text-positive"
      : tone === "negative"
        ? "text-destructive"
        : tone === "accent"
          ? "text-primary"
          : "text-foreground";

  return (
    <div className={cn("stat-card min-w-0 rounded-lg border bg-card p-5 sm:p-6", tone === "accent" && "stat-card-accent")}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        {Icon && <span className="stat-icon flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted"><Icon className="size-4 text-muted-foreground" /></span>}
      </div>
      <p className={cn("stat-value tnum mt-4 break-words text-2xl font-bold", toneClass)}>{fmtMoney(value, hidden)}</p>
      {hint && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}
