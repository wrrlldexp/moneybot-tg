import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getGrids, startGrid, stopGrid, type Grid } from "@/api/endpoints";
import { StatusBadge } from "@/components/StatusBadge";
import { useNavigate } from "react-router-dom";
import { useTelegram } from "@/hooks/useTelegram";
import { Play, Square } from "lucide-react";

export function Grids() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  const { data: grids, isLoading } = useQuery({
    queryKey: ["grids"],
    queryFn: getGrids,
    refetchInterval: 10_000,
  });

  const startMutation = useMutation({
    mutationFn: startGrid,
    onSuccess: () => {
      haptic?.notificationOccurred("success");
      queryClient.invalidateQueries({ queryKey: ["grids"] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: stopGrid,
    onSuccess: () => {
      haptic?.notificationOccurred("warning");
      queryClient.invalidateQueries({ queryKey: ["grids"] });
    },
  });

  const handleToggle = (e: React.MouseEvent, grid: Grid) => {
    e.stopPropagation();
    haptic?.impactOccurred("medium");
    if (grid.status === "running") {
      stopMutation.mutate(grid.id);
    } else {
      startMutation.mutate(grid.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-tg-button border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Grids</h1>

      {!grids?.length ? (
        <div className="text-center py-12 text-tg-hint">
          <p>No grids yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {grids.map((grid) => (
            <div
              key={grid.id}
              onClick={() => navigate(`/grids/${grid.id}`)}
              className="rounded-xl bg-tg-secondary p-3 border border-white/5 active:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-sm">{grid.name}</p>
                  <p className="text-xs text-tg-hint">{grid.symbol} · {grid.strategy}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={grid.status} />
                  <button
                    onClick={(e) => handleToggle(e, grid)}
                    disabled={startMutation.isPending || stopMutation.isPending}
                    className="p-1.5 rounded-lg bg-white/5 active:bg-white/10 transition-colors"
                  >
                    {grid.status === "running" ? (
                      <Square size={14} className="text-red-400" />
                    ) : (
                      <Play size={14} className="text-emerald-400" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-tg-hint">
                  {grid.mode} · {grid.levels_above + grid.levels_below} levels
                </span>
                <span className={`font-semibold tabular-nums ${Number(grid.realized_pnl) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {Number(grid.realized_pnl) >= 0 ? "+" : ""}{Number(grid.realized_pnl).toFixed(4)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
