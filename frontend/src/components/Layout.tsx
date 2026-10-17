import { Activity, ArrowLeftRight, BarChart3, CandlestickChart, ChevronRight, ClipboardList, Home, LogOut, ScrollText, Shield, UserCircle, Users } from "lucide-react";
import type { PropsWithChildren } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { logout } from "../api/auth";
import { useAuthStore } from "../store/auth";
import { PageTransition } from "./PageTransition";

const navItems = [
  { to: "/dashboard", label: "Обзор", icon: Home },
  { to: "/grids", label: "Сетки", icon: BarChart3 },
  { to: "/chart", label: "Рынок", icon: CandlestickChart },
  { to: "/trades", label: "Операции", icon: ArrowLeftRight },
  { to: "/monitoring", label: "Система", icon: Activity },
  { to: "/accounts", label: "Аккаунты", icon: ClipboardList },
  { to: "/logs", label: "Журнал", icon: ScrollText },
  { to: "/users", label: "Команда", icon: Users },
  { to: "/audit", label: "Аудит", icon: Shield },
  { to: "/profile", label: "Профиль", icon: UserCircle },
];

export function Layout({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const tokens = useAuthStore((state) => state.tokens);
  const isGuest = useAuthStore((state) => state.isGuest);
  const profileName = useAuthStore((state) => state.profileName);
  const clear = useAuthStore((state) => state.logout);

  const onLogout = async () => {
    if (tokens?.access_token && tokens?.refresh_token) await logout(tokens.access_token, tokens.refresh_token).catch(() => undefined);
    clear();
    navigate("/login");
  };

  const visibleItems = navItems.filter((item) => !isGuest || item.to === "/dashboard");
  const currentPage = visibleItems.find((item) => location.pathname.startsWith(item.to));
  const displayName = user?.full_name || profileName || "Гость";
  const initials = displayName.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <div className="min-h-[100dvh] bg-[#070c12] text-slate-100">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-xl focus:bg-blue-500 focus:px-4 focus:py-2">К содержимому</a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[84px] flex-col border-r border-white/[0.06] bg-[#091018]/95 px-3 py-5 backdrop-blur-xl md:flex">
        <Link to="/dashboard" className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 text-lg font-black shadow-lg shadow-blue-500/20" aria-label="MoneyBot">M</Link>
        <nav className="mt-8 flex flex-1 flex-col items-center gap-2" aria-label="Основная навигация">
          {visibleItems.map((item) => (
            <NavLink key={item.to} to={item.to} title={item.label} className={({ isActive }) => `group relative flex h-11 w-11 items-center justify-center rounded-xl transition ${isActive ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-slate-500 hover:bg-white/[0.06] hover:text-slate-200"}`}>
              <item.icon size={19} />
              <span className="pointer-events-none absolute left-[54px] z-50 whitespace-nowrap rounded-lg border border-white/10 bg-[#111b27] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition group-hover:opacity-100">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button onClick={onLogout} title="Выйти" className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-rose-400/10 hover:text-rose-300"><LogOut size={18} /></button>
      </aside>
      <div className="min-h-[100dvh] md:pl-[84px]">
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#070c12]/85 px-4 backdrop-blur-xl sm:px-7">
          <div className="mx-auto flex h-16 max-w-[1380px] items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2 text-sm"><span className="font-semibold text-white">MoneyBot</span><ChevronRight size={14} className="text-white/20" /><span className="truncate text-white/40">{currentPage?.label || "Рабочая область"}</span></div>
            <Link to="/profile" className="flex items-center gap-2 rounded-xl p-1.5 pr-2.5 hover:bg-white/[0.05]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-400/15 bg-blue-400/10 text-[11px] font-semibold text-blue-200">{initials || "MB"}</span>
              <span className="hidden text-right sm:block"><span className="block max-w-[180px] truncate text-xs font-medium">{displayName}</span><span className="block text-[10px] text-white/30">{user?.role || (isGuest ? "guest" : "viewer")}</span></span>
            </Link>
          </div>
        </header>
        <main id="main-content" className="mx-auto max-w-[1430px] p-3 pb-24 sm:p-6 sm:pb-24 md:pb-6"><PageTransition>{children}</PageTransition></main>
      </div>
      <nav className="fixed inset-x-2 bottom-2 z-50 rounded-2xl border border-white/[0.08] bg-[#0c141e]/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl md:hidden" aria-label="Мобильная навигация">
        <div className="no-scrollbar flex overflow-x-auto">
          {visibleItems.slice(0, isGuest ? 1 : 6).map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex min-w-[64px] flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[9px] font-medium transition ${isActive ? "bg-blue-500 text-white" : "text-white/35"}`}>
              <item.icon size={17} /><span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
