import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { money } from "@/lib/format";

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
  const toneClass =
    tone === "positive"
      ? "text-positive"
      : tone === "negative"
        ? "text-destructive"
        : tone === "accent"
          ? "text-primary"
          : "text-foreground";

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <p className={cn("tnum mt-3 text-xl font-bold sm:text-2xl", toneClass)}>{money(value)}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
