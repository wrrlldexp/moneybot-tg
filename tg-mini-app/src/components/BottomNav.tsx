import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Grid3X3, Bot, Settings } from "lucide-react";
import { cn } from "./ui/cn";

const NAV_ITEMS = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/grids", icon: Grid3X3, label: "Grids" },
  { path: "/bot", icon: Bot, label: "Bot" },
  { path: "/settings", icon: Settings, label: "Settings" },
] as const;

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-tg-secondary border-t border-white/5">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors",
                isActive ? "text-tg-button" : "text-tg-hint",
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
