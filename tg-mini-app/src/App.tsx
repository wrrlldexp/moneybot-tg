import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Dashboard } from "@/pages/Dashboard";
import { Grids } from "@/pages/Grids";
import { GridDetail } from "@/pages/GridDetail";
import { BotControl } from "@/pages/BotControl";
import { SettingsPage } from "@/pages/Settings";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isTelegram } = useAuth();

  if (!isTelegram) {
    return (
      <div className="flex items-center justify-center h-screen bg-tg-bg text-tg-text px-6">
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold">MoneyBot</p>
          <p className="text-sm text-tg-hint">
            Open this app from Telegram to continue.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-tg-bg text-tg-text px-6">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-tg-button border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-tg-hint">Authenticating...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthGate>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/grids" element={<Grids />} />
          <Route path="/grids/:id" element={<GridDetail />} />
          <Route path="/bot" element={<BotControl />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </AuthGate>
  );
}
