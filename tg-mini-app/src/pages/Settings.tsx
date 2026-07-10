import { useAuthStore } from "@/stores/authStore";
import { useTelegram } from "@/hooks/useTelegram";
import { User, Bell, Shield } from "lucide-react";

export function SettingsPage() {
  const { user } = useAuthStore();
  const { platform, colorScheme } = useTelegram();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* User info */}
      <div className="rounded-xl bg-tg-secondary p-4 border border-white/5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-tg-button/20 flex items-center justify-center">
            <User size={20} className="text-tg-button" />
          </div>
          <div>
            <p className="font-medium text-sm">{user?.full_name ?? "—"}</p>
            <p className="text-xs text-tg-hint">{user?.email ?? "—"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-y-2 text-sm pt-2 border-t border-white/5">
          <span className="text-tg-hint">Role</span>
          <span className="text-right font-medium capitalize">{user?.role ?? "—"}</span>
          <span className="text-tg-hint">Telegram</span>
          <span className="text-right font-medium">@{user?.telegram_username ?? "—"}</span>
        </div>
      </div>

      {/* Notifications placeholder */}
      <div className="rounded-xl bg-tg-secondary p-4 border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={16} className="text-tg-accent" />
          <span className="font-medium text-sm">Notifications</span>
        </div>
        <div className="space-y-3">
          <ToggleRow label="Trade notifications" defaultChecked />
          <ToggleRow label="Error alerts" defaultChecked />
          <ToggleRow label="Grid status changes" defaultChecked />
          <ToggleRow label="Daily summary" defaultChecked={false} />
        </div>
      </div>

      {/* App info */}
      <div className="rounded-xl bg-tg-secondary p-4 border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-tg-accent" />
          <span className="font-medium text-sm">App Info</span>
        </div>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-tg-hint">Platform</span>
          <span className="text-right font-medium">{platform}</span>
          <span className="text-tg-hint">Theme</span>
          <span className="text-right font-medium">{colorScheme}</span>
          <span className="text-tg-hint">Version</span>
          <span className="text-right font-medium">1.0.0</span>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, defaultChecked }: { label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="w-9 h-5 appearance-none bg-white/10 rounded-full relative cursor-pointer transition-colors checked:bg-tg-button
          before:content-[''] before:absolute before:w-4 before:h-4 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-4"
      />
    </label>
  );
}
