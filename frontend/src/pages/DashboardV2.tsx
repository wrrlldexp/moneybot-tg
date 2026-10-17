import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Gauge,
  Layers3,
  Plus,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fetchBotStatus } from "../api/bot";
import { fetchAnalytics, fetchDashboard } from "../api/dashboard";
import type { DashboardData, PeriodStats, PositionSummary } from "../api/dashboard";
import { useAuthStore } from "../store/auth";

const strategyMeta: Record<string, { label: string; color: string; soft: string }> = {
  simple: { label: "Simple", color: "#60a5fa", soft: "bg-blue-400/10 text-blue-300" },
  adaptive: { label: "Adaptive", color: "#a78bfa", soft: "bg-violet-400/10 text-violet-300" },
  reverse: { label: "Reverse", color: "#fb923c", soft: "bg-orange-400/10 text-orange-300" },
};

const DEMO: DashboardData = {
  total_grids: 3,
  active_grids: 2,
  total_pnl: 142.58,
  total_trades: 47,
  win_rate: 72.3,
  strategies: [
    { strategy: "simple", grids_count: 1, active_count: 1, total_pnl: 42.18, total_trades: 15 },
    { strategy: "adaptive", grids_count: 1, active_count: 1, total_pnl: 108.8, total_trades: 28 },
    { strategy: "reverse", grids_count: 1, active_count: 0, total_pnl: -8.4, total_trades: 4 },
  ],
  positions: [
    { grid_id: "demo-1", grid_name: "BTC Core", symbol: "BTC/USDT", strategy: "simple", status: "running", mode: "paper", side: "long", entry_price: 67500, current_levels: 6, filled_orders: 2, realized_pnl: 42.18, total_trades: 15, auto_convert_to: null, unconverted_pnl: 0 },
    { grid_id: "demo-2", grid_name: "ETH Flow", symbol: "ETH/USDT", strategy: "adaptive", status: "running", mode: "paper", side: "long", entry_price: 3250, current_levels: 10, filled_orders: 4, realized_pnl: 108.8, total_trades: 28, auto_convert_to: "USDC", unconverted_pnl: 0.85 },
    { grid_id: "demo-3", grid_name: "SOL Reverse", symbol: "SOL/USDT", strategy: "reverse", status: "stopped", mode: "paper", side: "long", entry_price: 146.2, current_levels: 6, filled_orders: 0, realized_pnl: -8.4, total_trades: 4, auto_convert_to: null, unconverted_pnl: 0 },
  ],
  equity_curve: [
    { date: "01", label: "1 окт", value: 0 }, { date: "02", label: "2 окт", value: 18.4 },
    { date: "03", label: "3 окт", value: 12.2 }, { date: "04", label: "4 окт", value: 46.8 },
    { date: "05", label: "5 окт", value: 78.1 }, { date: "06", label: "6 окт", value: 101.3 },
    { date: "07", label: "7 окт", value: 142.58 },
  ],
};

function money(value: number, signed = true) {
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

function Metric({ label, value, detail, icon: Icon, tone = "neutral" }: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "positive" | "negative" | "neutral";
}) {
  const tones = {
    positive: "text-emerald-300 bg-emerald-400/10 border-emerald-400/15",
    negative: "text-rose-300 bg-rose-400/10 border-rose-400/15",
    neutral: "text-slate-200 bg-white/[0.045] border-white/[0.07]",
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45">{label}</span>
        <Icon size={17} className="opacity-70" />
      </div>
      <div className="mt-5 text-2xl font-semibold tracking-[-0.04em] sm:text-[28px]">{value}</div>
      <div className="mt-1 text-xs text-white/40">{detail}</div>
    </div>
  );
}

function StrategyCard({ strategy, grids, active, pnl, trades }: {
  strategy: string; grids: number; active: number; pnl: number; trades: number;
}) {
  const meta = strategyMeta[strategy] || { label: strategy, color: "#94a3b8", soft: "bg-slate-400/10 text-slate-300" };
  return (
    <div className="group rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.045] to-white/[0.018] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.055]">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: meta.color, boxShadow: `0 0 12px ${meta.color}` }} />
            <h3 className="font-semibold">{meta.label}</h3>
          </div>
          <p className="mt-1 text-xs text-white/35">{active} активных из {grids}</p>
        </div>
        <span className={`rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${meta.soft}`}>
          {active ? "работает" : "пауза"}
        </span>
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/30">Результат</div>
          <div className={`mt-1 text-xl font-semibold ${pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{money(pnl)} USDT</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-white/30">Исполнений</div>
          <div className="mt-1 text-sm font-medium text-white/70">{trades}</div>
        </div>
      </div>
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.05]">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${grids ? Math.max(8, (active / grids) * 100) : 0}%`, background: meta.color }} />
      </div>
    </div>
  );
}

function StatusPill({ position }: { position: PositionSummary }) {
  const running = position.status === "running";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${running ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-white/40"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${running ? "bg-emerald-400" : "bg-white/30"}`} />
      {running ? "Активна" : "Остановлена"}
    </span>
  );
}

function GridsTable({ rows }: { rows: PositionSummary[] }) {
  if (!rows.length) return <div className="py-14 text-center text-sm text-white/35">Сетки ещё не созданы</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead className="text-[10px] uppercase tracking-[0.14em] text-white/30">
          <tr className="border-b border-white/[0.06]">
            <th className="px-5 py-3 font-medium">Сетка</th><th className="px-3 py-3 font-medium">Стратегия</th>
            <th className="px-3 py-3 font-medium">Статус</th><th className="px-3 py-3 text-right font-medium">Уровни</th>
            <th className="px-3 py-3 text-right font-medium">Исполнения</th><th className="px-5 py-3 text-right font-medium">Реализованный PnL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const meta = strategyMeta[row.strategy] || strategyMeta.simple;
            return (
              <tr key={row.grid_id} className="border-b border-white/[0.045] text-sm transition hover:bg-white/[0.025] last:border-0">
                <td className="px-5 py-4"><Link to={`/grids/${row.grid_id}`} className="font-medium hover:text-blue-300">{row.grid_name}</Link><div className="mt-0.5 text-xs text-white/35">{row.symbol} · {row.mode.toUpperCase()}</div></td>
                <td className="px-3 py-4"><span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />{meta.label}</span></td>
                <td className="px-3 py-4"><StatusPill position={row} /></td>
                <td className="px-3 py-4 text-right text-white/65">{row.current_levels}</td>
                <td className="px-3 py-4 text-right text-white/65">{row.filled_orders}</td>
                <td className={`px-5 py-4 text-right font-semibold ${row.realized_pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{money(row.realized_pnl)} USDT</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardV2Page() {
  const isGuest = useAuthStore((state) => state.isGuest);
  const dashboardQuery = useQuery({ queryKey: ["dashboard-v2"], queryFn: fetchDashboard, enabled: !isGuest, refetchInterval: 15_000 });
  const analyticsQuery = useQuery({ queryKey: ["analytics-v2"], queryFn: () => fetchAnalytics(30), enabled: !isGuest, refetchInterval: 60_000 });
  const botQuery = useQuery({ queryKey: ["bot-status-v2"], queryFn: fetchBotStatus, enabled: !isGuest, refetchInterval: 10_000 });

  const dashboard = isGuest ? DEMO : dashboardQuery.data;
  const stats: PeriodStats | undefined = analyticsQuery.data?.total_stats;
  const botOnline = isGuest || Boolean(botQuery.data?.online);
  const heartbeatAge = botQuery.data?.age_sec;

  if (!dashboard && dashboardQuery.isLoading) {
    return <div className="flex min-h-[65vh] items-center justify-center"><RefreshCw className="animate-spin text-blue-300" /></div>;
  }
  if (!dashboard) {
    return <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-6 text-sm text-rose-200">Не удалось получить данные дашборда.</div>;
  }

  const chartData = analyticsQuery.data?.period_stats && analyticsQuery.data.pnl_series.length
    ? analyticsQuery.data.pnl_series[0]?.points
    : dashboard.equity_curve;

  return (
    <div className="dashboard-v2 text-slate-100">
      <div className="mx-auto max-w-[1260px] space-y-5">
        <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-[radial-gradient(circle_at_75%_-20%,rgba(52,211,153,0.11),transparent_34%),radial-gradient(circle_at_10%_0%,rgba(96,165,250,0.12),transparent_30%),linear-gradient(145deg,#101a26,#0b121b)] p-5 shadow-2xl shadow-black/20 sm:p-7">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${botOnline ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-rose-400/20 bg-rose-400/10 text-rose-300"}`}>
                  {botOnline ? <Wifi size={13} /> : <WifiOff size={13} />}{botOnline ? "Робот в сети" : "Робот не отвечает"}
                </span>
                <span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-3 py-1 text-xs text-white/45">Данные за 30 дней</span>
                {isGuest && <span className="rounded-full bg-violet-400/10 px-3 py-1 text-xs text-violet-300">Демо</span>}
              </div>
              <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/35">Общий результат</div>
              <div className={`mt-2 text-4xl font-semibold tracking-[-0.055em] sm:text-6xl ${dashboard.total_pnl >= 0 ? "text-white" : "text-rose-200"}`}>{money(dashboard.total_pnl)} <span className="text-xl font-medium tracking-normal text-white/30 sm:text-2xl">USDT</span></div>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/40">
                <span className="inline-flex items-center gap-1.5"><TrendingUp size={14} className="text-emerald-300" /> Реализованный PnL</span>
                <span>{dashboard.total_trades} исполнений</span>
                <span>{dashboard.active_grids} сетки в работе</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Link to="/grids" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/[0.08]">Управление <ArrowUpRight size={15} /></Link>
              <Link to="/grids/new" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 hover:bg-slate-100"><Plus size={16} /> Создать сетку</Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Результат 30 дней" value={stats ? `${money(stats.pnl_month)} USDT` : "—"} detail="после расчётной комиссии" icon={CircleDollarSign} tone={!stats || stats.pnl_month >= 0 ? "positive" : "negative"} />
          <Metric label="Активные сетки" value={`${dashboard.active_grids} / ${dashboard.total_grids}`} detail="запущено сейчас" icon={Layers3} />
          <Metric label="Закрытые круги" value={String(stats?.total_rounds ?? "—")} detail="за выбранный период" icon={RefreshCw} />
          <Metric label="Win rate" value={stats ? `${stats.win_rate}%` : `${dashboard.win_rate}%`} detail={stats ? "по аналитике периода" : "по текущей сводке"} icon={ShieldCheck} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.65fr_0.75fr]">
          <div className="rounded-3xl border border-white/[0.07] bg-gradient-to-b from-[#0f1925] to-[#0b131c] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div><div className="text-xs uppercase tracking-[0.18em] text-white/35">Доходность</div><h2 className="mt-1 text-lg font-semibold">Кривая реализованной прибыли</h2></div>
              <div className="flex rounded-xl border border-white/[0.06] bg-black/15 p-1 text-[10px] font-medium text-white/35"><span className="px-2 py-1">7Д</span><span className="rounded-lg bg-white/[0.09] px-2 py-1 text-white/80">30Д</span><span className="px-2 py-1">Всё</span></div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 10, right: 4, left: -18, bottom: 0 }}>
                <defs><linearGradient id="v2Pnl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.3} /><stop offset="100%" stopColor="#34d399" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="rgba(255,255,255,.045)" vertical={false} />
                <XAxis dataKey={chartData === dashboard.equity_curve ? "label" : "date"} axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,.3)", fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,.3)", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#101b28", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12 }} />
                <Area type="monotone" dataKey={chartData === dashboard.equity_curve ? "value" : "cumulative"} stroke="#34d399" strokeWidth={2.5} fill="url(#v2Pnl)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-3xl border border-white/[0.07] bg-gradient-to-b from-[#0f1925] to-[#0b131c] p-5 sm:p-6">
            <div className="flex items-center gap-2"><Gauge size={18} className="text-cyan-300" /><h2 className="font-semibold">Нагрузка системы</h2></div>
            <div className="mt-5 space-y-3">
              {[
                { label: "Worker", value: botOnline ? "Онлайн" : "Оффлайн", icon: Bot, ok: botOnline },
                { label: "Heartbeat", value: heartbeatAge == null ? (isGuest ? "демо" : "нет данных") : `${Math.round(heartbeatAge)} сек`, icon: Activity, ok: heartbeatAge == null || heartbeatAge < 30 },
                { label: "Оперативные данные", value: "15 сек", icon: Zap, ok: true },
                { label: "Тяжёлая аналитика", value: "60 сек", icon: BarChart3, ok: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-2xl bg-white/[0.035] p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]"><item.icon size={16} className={item.ok ? "text-emerald-300" : "text-rose-300"} /></div>
                  <div className="min-w-0 flex-1"><div className="text-xs text-white/40">{item.label}</div><div className="mt-0.5 text-sm font-medium">{item.value}</div></div>
                  {item.ok ? <CheckCircle2 size={16} className="text-emerald-400/70" /> : <TrendingDown size={16} className="text-rose-400" />}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-white/[0.08] px-3 py-2.5 text-[11px] leading-5 text-white/30">CPU и RAM подключим после серверной телеметрии. Сейчас здесь только реальные измеряемые параметры.</div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between"><div><div className="text-xs uppercase tracking-[0.18em] text-white/35">Торговые движки</div><h2 className="mt-1 text-xl font-semibold">Стратегии</h2></div><span className="text-xs text-white/30">Каждая работает независимо</span></div>
          <div className="grid gap-3 md:grid-cols-3">
            {["simple", "adaptive", "reverse"].map((name) => {
              const item = dashboard.strategies.find((strategy) => strategy.strategy === name);
              return <StrategyCard key={name} strategy={name} grids={item?.grids_count ?? 0} active={item?.active_count ?? 0} pnl={item?.total_pnl ?? 0} trades={item?.total_trades ?? 0} />;
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-b from-[#0f1925] to-[#0b131c]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div><div className="text-xs uppercase tracking-[0.18em] text-white/35">Исполнение</div><h2 className="mt-1 text-lg font-semibold">Сетки в работе</h2></div>
            <div className="flex items-center gap-2 text-xs text-white/35"><Clock3 size={14} /> обновление 15 сек</div>
          </div>
          <GridsTable rows={dashboard.positions} />
        </section>
      </div>
    </div>
  );
}
