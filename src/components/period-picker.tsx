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
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value} onValueChange={(v) => onChange(v as PeriodKey)}>
        <SelectTrigger className="w-[180px]">
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
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-[150px]"
            value={from}
            onChange={(e) => onFrom(e.target.value)}
          />
          <span className="text-muted-foreground">até</span>
          <Input
            type="date"
            className="w-[150px]"
            value={to}
            onChange={(e) => onTo(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
