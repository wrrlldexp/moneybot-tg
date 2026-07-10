/**
 * Typed API endpoints.
 */

import { api } from "./client";

// --- Auth ---

export interface TelegramLoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    telegram_id: number;
    telegram_username: string | null;
  };
}

export async function telegramLogin(initData: string): Promise<TelegramLoginResponse> {
  const { data } = await api.post<TelegramLoginResponse>("/api/tg-auth/login", { init_data: initData });
  return data;
}

// --- Dashboard ---

export interface DashboardData {
  total_grids: number;
  active_grids: number;
  total_pnl: number;
  total_trades: number;
  win_rate: number;
  strategies: StrategyStats[];
  positions: PositionSummary[];
  equity_curve: { date: string; value: number; label: string }[];
}

export interface StrategyStats {
  strategy: string;
  grids_count: number;
  active_count: number;
  total_pnl: number;
  total_trades: number;
}

export interface PositionSummary {
  grid_id: string;
  grid_name: string;
  symbol: string;
  strategy: string;
  status: string;
  mode: string;
  side: string;
  entry_price: number;
  current_levels: number;
  filled_orders: number;
  realized_pnl: number;
  total_trades: number;
}

export async function getDashboard(): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>("/api/dashboard/");
  return data;
}

// --- Grids ---

export interface Grid {
  id: string;
  name: string;
  symbol: string;
  mode: string;
  status: string;
  strategy: string;
  lot_size: string;
  profit_step: string;
  grid_step: string;
  levels_above: number;
  levels_below: number;
  total_trades: number;
  realized_pnl: string;
  created_at: string;
}

export async function getGrids(): Promise<Grid[]> {
  const { data } = await api.get<Grid[]>("/api/grids/");
  return data;
}

export async function getGrid(id: string): Promise<Grid> {
  const { data } = await api.get<Grid>(`/api/grids/${id}`);
  return data;
}

export async function startGrid(id: string): Promise<Grid> {
  const { data } = await api.post<Grid>(`/api/grids/${id}/start`);
  return data;
}

export async function stopGrid(id: string): Promise<Grid> {
  const { data } = await api.post<Grid>(`/api/grids/${id}/stop`);
  return data;
}

// --- Bot ---

export interface BotStatus {
  worker_running: boolean;
  active_grids: number;
  uptime_seconds: number | null;
}

export async function getBotStatus(): Promise<BotStatus> {
  const { data } = await api.get<BotStatus>("/api/bot/status");
  return data;
}

export async function stopAllGrids(): Promise<{ stopped: number }> {
  const { data } = await api.post<{ stopped: number }>("/api/bot/stop-all");
  return data;
}
