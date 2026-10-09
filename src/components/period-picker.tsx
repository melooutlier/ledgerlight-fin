import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PeriodKey } from "@/lib/period";

export function PeriodPicker({
  value,
  onChange,
  from,
  to,
  onFrom,
  onTo,
}: {
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  return (
    <div className="period-picker flex min-w-0 flex-wrap items-center gap-2">
      <Select value={value} onValueChange={(v) => onChange(v as PeriodKey)}>
        <SelectTrigger className="w-full sm:w-[180px]" aria-label="Período">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="this_month">Este mês</SelectItem>
          <SelectItem value="last_month">Mês passado</SelectItem>
          <SelectItem value="last_30">Últimos 30 dias</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>
      {value === "custom" && (
        <div className="grid min-w-0 w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:w-auto">
          <Input
            type="date"
            className="min-w-0 w-full sm:w-[150px]"
            aria-label="Data inicial"
            value={from}
            onChange={(e) => onFrom(e.target.value)}
          />
          <span className="text-muted-foreground">até</span>
          <Input
            type="date"
            className="min-w-0 w-full sm:w-[150px]"
            aria-label="Data final"
            value={to}
            onChange={(e) => onTo(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
