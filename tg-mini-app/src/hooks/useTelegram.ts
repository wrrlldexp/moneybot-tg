/**
 * Hook for Telegram WebApp SDK.
 */

import { useEffect, useMemo } from "react";
import { getTelegramWebApp, type TelegramWebApp } from "@/lib/telegram";

export function useTelegram() {
  const webApp = useMemo(() => getTelegramWebApp(), []);

  useEffect(() => {
    if (webApp) {
      webApp.ready();
      webApp.expand();
    }
  }, [webApp]);

  return {
    webApp,
    user: webApp?.initDataUnsafe?.user ?? null,
    initData: webApp?.initData ?? "",
    colorScheme: webApp?.colorScheme ?? "dark",
    platform: webApp?.platform ?? "unknown",
    haptic: webApp?.HapticFeedback ?? null,
    mainButton: webApp?.MainButton ?? null,
    backButton: webApp?.BackButton ?? null,
  };
}
