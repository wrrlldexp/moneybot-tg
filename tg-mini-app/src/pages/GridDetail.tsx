import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getGrid, startGrid, stopGrid } from "@/api/endpoints";
import { StatusBadge } from "@/components/StatusBadge";
import { PnlCard } from "@/components/PnlCard";
import { useTelegram } from "@/hooks/useTelegram";
import { useEffect } from "react";
import { ArrowLeft, Play, Square } from "lucide-react";

export function GridDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { haptic, backButton } = useTelegram();

  useEffect(() => {
    backButton?.show();
    const handler = () => navigate("/grids");
    backButton?.onClick(handler);
    return () => {
      backButton?.offClick(handler);
      backButton?.hide();
    };
  }, [backButton, navigate]);

  const { data: grid, isLoading } = useQuery({
    queryKey: ["grid", id],
    queryFn: () => getGrid(id!),
    enabled: !!id,
    refetchInterval: 10_000,
  });

  const startMut = useMutation({
    mutationFn: () => startGrid(id!),
    onSuccess: () => {
      haptic?.notificationOccurred("success");
      queryClient.invalidateQueries({ queryKey: ["grid", id] });
    },
  });

  const stopMut = useMutation({
    mutationFn: () => stopGrid(id!),
    onSuccess: () => {
      haptic?.notificationOccurred("warning");
      queryClient.invalidateQueries({ queryKey: ["grid", id] });
    },
  });

  if (isLoading || !grid) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-tg-button border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isRunning = grid.status === "running";

  return (
    <div className="space-y-4">
      {/* Header */}
      <button onClick={() => navigate("/grids")} className="flex items-center gap-1 text-tg-hint text-sm">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{grid.name}</h1>
          <p className="text-sm text-tg-hint">{grid.symbol}</p>
        </div>
        <StatusBadge status={grid.status} />
      </div>

      {/* Action button */}
      <button
        onClick={() => isRunning ? stopMut.mutate() : startMut.mutate()}
        disabled={startMut.isPending || stopMut.isPending}
        className={`w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
          isRunning
            ? "bg-red-500/15 text-red-400 border border-red-500/20 active:bg-red-500/25"
            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 active:bg-emerald-500/25"
        }`}
      >
        {isRunning ? <><Square size={16} /> Stop Grid</> : <><Play size={16} /> Start Grid</>}
      </button>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <PnlCard label="Realized PnL" value={Number(grid.realized_pnl)} />
        <PnlCard label="Total Trades" value={grid.total_trades} />
      </div>

      {/* Config */}
      <div className="rounded-xl bg-tg-secondary p-4 border border-white/5 space-y-3">
        <h2 className="text-sm font-semibold text-tg-hint">Configuration</h2>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <Row label="Strategy" value={grid.strategy} />
          <Row label="Mode" value={grid.mode} />
          <Row label="Lot Size" value={grid.lot_size} />
          <Row label="Grid Step" value={grid.grid_step} />
          <Row label="Profit Step" value={grid.profit_step} />
          <Row label="Levels" value={`${grid.levels_above}↑ ${grid.levels_below}↓`} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-tg-hint">{label}</span>
      <span className="text-right font-medium tabular-nums">{value}</span>
    </>
  );
}
