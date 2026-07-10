import { cn } from "./ui/cn";

const STATUS_STYLES: Record<string, string> = {
  running: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  stopped: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  error: "bg-red-500/15 text-red-400 border-red-500/20",
  draft: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border",
        STATUS_STYLES[status] ?? STATUS_STYLES["draft"],
        className,
      )}
    >
      <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        status === "running" ? "bg-emerald-400 animate-pulse" : "bg-current",
      )} />
      {status}
    </span>
  );
}
