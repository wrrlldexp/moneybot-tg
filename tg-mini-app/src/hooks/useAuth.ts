/**
 * Telegram auth hook — authenticates via initData on mount.
 */

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { telegramLogin } from "@/api/endpoints";
import { getInitData, isTelegramContext } from "@/lib/telegram";

export function useAuth() {
  const { isAuthenticated, setAuth, logout } = useAuthStore();
  const attempted = useRef(false);

  useEffect(() => {
    if (isAuthenticated || attempted.current) return;
    attempted.current = true;

    const initData = getInitData();
    if (!initData) return;

    telegramLogin(initData)
      .then((res) => {
        setAuth(res.access_token, res.refresh_token, res.user);
      })
      .catch(() => {
        logout();
      });
  }, [isAuthenticated, setAuth, logout]);

  return {
    isAuthenticated,
    isTelegram: isTelegramContext(),
    user: useAuthStore((s) => s.user),
  };
}
