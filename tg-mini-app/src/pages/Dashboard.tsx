import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/api/endpoints";
import { PnlCard } from "@/components/PnlCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Activity, TrendingUp, Zap } from "lucide-react";

export function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    refetchInterval: 15_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-tg-button border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12 text-tg-hint">
        <p>Failed to load dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <StatusBadge status={data.active_grids > 0 ? "running" : "stopped"} />
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3">
        <PnlCard label="Total PnL" value={data.total_pnl} />
        <PnlCard label="Win Rate" value={data.win_rate} suffix="%" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-tg-secondary p-3 border border-white/5 text-center">
          <Zap size={16} className="mx-auto mb-1 text-tg-accent" />
          <p className="text-lg font-semibold">{data.active_grids}</p>
          <p className="text-[10px] text-tg-hint">Active</p>
        </div>
        <div className="rounded-xl bg-tg-secondary p-3 border border-white/5 text-center">
          <Activity size={16} className="mx-auto mb-1 text-tg-accent" />
          <p className="text-lg font-semibold">{data.total_grids}</p>
          <p className="text-[10px] text-tg-hint">Total Grids</p>
        </div>
        <div className="rounded-xl bg-tg-secondary p-3 border border-white/5 text-center">
          <TrendingUp size={16} className="mx-auto mb-1 text-tg-accent" />
          <p className="text-lg font-semibold">{data.total_trades}</p>
          <p className="text-[10px] text-tg-hint">Trades</p>
        </div>
      </div>

      {/* Positions */}
      {data.positions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-tg-hint mb-2">Positions</h2>
          <div className="space-y-2">
            {data.positions.map((pos) => (
              <div
                key={pos.grid_id}
                className="rounded-xl bg-tg-secondary p-3 border border-white/5 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-sm">{pos.grid_name}</p>
                  <p className="text-xs text-tg-hint">{pos.symbol} · {pos.strategy}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold tabular-nums ${pos.realized_pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {pos.realized_pnl >= 0 ? "+" : ""}{pos.realized_pnl.toFixed(4)}
                  </p>
                  <StatusBadge status={pos.status} className="mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategies */}
      {data.strategies.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-tg-hint mb-2">Strategies</h2>
          <div className="space-y-2">
            {data.strategies.map((s) => (
              <div
                key={s.strategy}
                className="rounded-xl bg-tg-secondary p-3 border border-white/5 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium capitalize">{s.strategy.replace("_", " ")}</p>
                  <p className="text-xs text-tg-hint">{s.active_count}/{s.grids_count} active</p>
                </div>
                <p className={`text-sm font-semibold tabular-nums ${s.total_pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {s.total_pnl >= 0 ? "+" : ""}{s.total_pnl.toFixed(4)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
