import { cn } from "./ui/cn";

interface PnlCardProps {
  label: string;
  value: number;
  suffix?: string;
  className?: string;
}

export function PnlCard({ label, value, suffix = "", className }: PnlCardProps) {
  const isPositive = value > 0;
  const isZero = value === 0;

  return (
    <div className={cn("rounded-xl bg-tg-secondary p-3 border border-white/5", className)}>
      <p className="text-xs text-tg-hint mb-1">{label}</p>
      <p
        className={cn(
          "text-lg font-semibold tabular-nums",
          isZero ? "text-tg-text" : isPositive ? "text-emerald-400" : "text-red-400",
        )}
      >
        {isPositive && "+"}
        {value.toFixed(2)}
        {suffix && <span className="text-xs text-tg-hint ml-1">{suffix}</span>}
      </p>
    </div>
  );
}
