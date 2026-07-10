/**
 * Auth state — Zustand store.
 */

import { create } from "zustand";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  telegram_id: number;
  telegram_username: string | null;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,

  setAuth: (accessToken, refreshToken, user) =>
    set({ accessToken, refreshToken, user, isAuthenticated: true }),

  logout: () =>
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false }),
}));
