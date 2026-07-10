import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBotStatus, stopAllGrids } from "@/api/endpoints";
import { StatusBadge } from "@/components/StatusBadge";
import { useTelegram } from "@/hooks/useTelegram";
import { useState } from "react";
import { AlertTriangle, Power, RefreshCw } from "lucide-react";

export function BotControl() {
  const queryClient = useQueryClient();
  const { haptic } = useTelegram();
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["bot-status"],
    queryFn: getBotStatus,
    refetchInterval: 5_000,
  });

  const stopAllMut = useMutation({
    mutationFn: stopAllGrids,
    onSuccess: (result) => {
      haptic?.notificationOccurred("warning");
      setShowConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["bot-status"] });
      queryClient.invalidateQueries({ queryKey: ["grids"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-tg-button border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const uptime = status?.uptime_seconds
    ? `${Math.floor(status.uptime_seconds / 3600)}h ${Math.floor((status.uptime_seconds % 3600) / 60)}m`
    : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Bot Control</h1>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-lg bg-white/5 active:bg-white/10 transition-colors"
        >
          <RefreshCw size={16} className="text-tg-hint" />
        </button>
      </div>

      {/* Worker status */}
      <div className="rounded-xl bg-tg-secondary p-4 border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Power size={18} className={status?.worker_running ? "text-emerald-400" : "text-red-400"} />
            <span className="font-medium">Worker</span>
          </div>
          <StatusBadge status={status?.worker_running ? "running" : "stopped"} />
        </div>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-tg-hint">Active Grids</span>
          <span className="text-right font-medium">{status?.active_grids ?? 0}</span>
          <span className="text-tg-hint">Uptime</span>
          <span className="text-right font-medium">{uptime}</span>
        </div>
      </div>

      {/* Emergency stop */}
      {!showConfirm ? (
        <button
          onClick={() => {
            haptic?.impactOccurred("heavy");
            setShowConfirm(true);
          }}
          className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 font-medium text-sm flex items-center justify-center gap-2 active:bg-red-500/20 transition-colors"
        >
          <AlertTriangle size={16} />
          Emergency Stop All
        </button>
      ) : (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 space-y-3">
          <p className="text-sm text-red-400 font-medium text-center">
            Stop ALL running grids?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-2.5 rounded-lg bg-white/5 text-tg-text text-sm font-medium active:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => stopAllMut.mutate()}
              disabled={stopAllMut.isPending}
              className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium active:bg-red-600 transition-colors disabled:opacity-50"
            >
              {stopAllMut.isPending ? "Stopping..." : "Confirm Stop"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
