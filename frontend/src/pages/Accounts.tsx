import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, RefreshCw, WalletCards } from "lucide-react";
import { useState } from "react";

import { createAccount, deleteAccount, listAccounts, testAccount } from "../api/accounts";
import { fetchBalances, type AccountBalance } from "../api/dashboard";
import { useAuthStore } from "../store/auth";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Empty } from "../components/Empty";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { useToast } from "../components/Toast";

export function AccountsPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const canManage = currentUser?.role === "admin" || currentUser?.role === "superadmin" || currentUser?.role === "ultraadmin";
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts"], queryFn: listAccounts });
  const balancesQuery = useQuery({
    queryKey: ["balances"],
    queryFn: fetchBalances,
    staleTime: 30_000,
    retry: false,
  });
  const { toast } = useToast();
  const [form, setForm] = useState<{
    name: string;
    exchange: "binance" | "bybit";
    api_key: string;
    api_secret: string;
    is_testnet: boolean;
  }>({
    name: "Binance Testnet",
    exchange: "binance",
    api_key: "",
    api_secret: "",
    is_testnet: true,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["accounts"] });
    void queryClient.invalidateQueries({ queryKey: ["balances"] });
  };

  return (
    <div className="space-y-5">
      {canManage && (
        <Card className="space-y-3">
          <h1 className="text-2xl font-bold">Биржевые аккаунты</h1>
          <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Название" />
          <Select value={form.exchange} onChange={(event) => setForm({ ...form, exchange: event.target.value as "binance" | "bybit" })}>
            <option value="binance">Binance</option>
            <option value="bybit">Bybit</option>
          </Select>
          <Input value={form.api_key} onChange={(event) => setForm({ ...form, api_key: event.target.value })} placeholder="API key" />
          <Input type="password" value={form.api_secret} onChange={(event) => setForm({ ...form, api_secret: event.target.value })} placeholder="API secret" />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_testnet}
              onChange={(event) => setForm({ ...form, is_testnet: event.target.checked })}
              className="h-4 w-4 rounded border-white/20 bg-white/5"
            />
            Тестовая сеть (Testnet)
          </label>
          <Button
            onClick={async () => {
              try {
                await createAccount(form);
                refresh();
                toast("Аккаунт добавлен", "success");
              } catch {
                toast("Ошибка при добавлении аккаунта", "error");
              }
            }}
          >
            Добавить аккаунт
          </Button>
        </Card>
      )}
      {!canManage && <h1 className="text-2xl font-bold">Биржевые аккаунты</h1>}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Аккаунты и кошельки</h2>
            <p className="text-xs text-hint">Свободные и занятые средства на спотовом балансе</p>
          </div>
          <Button
            className="bg-secondary px-3 text-text"
            disabled={balancesQuery.isFetching}
            onClick={() => void balancesQuery.refetch()}
          >
            <RefreshCw className={`h-4 w-4 ${balancesQuery.isFetching ? "animate-spin" : ""}`} />
            Обновить
          </Button>
        </div>
        {accounts.length === 0 && (
          <Empty icon={ClipboardList} title="Аккаунтов нет" description="Добавьте биржевой аккаунт для начала торговли" />
        )}
        {accounts.map((account) => (
          <div key={account.id} className="flex flex-col gap-3 rounded-2xl bg-secondary p-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{account.name}</div>
              <div className="text-sm text-hint">
                {account.exchange} · {account.is_testnet ? "testnet" : "live"}
              </div>
              <AccountWallet
                balance={balancesQuery.data?.find((item) => item.account_id === account.id)}
                isLoading={balancesQuery.isLoading}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="bg-secondary text-text"
                onClick={async () => {
                  try {
                    const result = await testAccount(account.id);
                    toast(result.message || "Готово", result.success ? "success" : "error");
                    if (result.success) void balancesQuery.refetch();
                  } catch {
                    toast("Ошибка при тестировании подключения", "error");
                  }
                }}
              >
                Тест
              </Button>
              {canManage && (
                <Button
                  onClick={async () => {
                    try {
                      await deleteAccount(account.id);
                      refresh();
                      toast("Аккаунт удалён", "success");
                    } catch {
                      toast("Ошибка при удалении аккаунта", "error");
                    }
                  }}
                >
                  Удалить
                </Button>
              )}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function AccountWallet({ balance, isLoading }: { balance?: AccountBalance; isLoading: boolean }) {
  if (isLoading) return <div className="mt-3 text-xs text-hint">Загружаю кошелёк…</div>;
  if (!balance) return null;
  if (balance.error) return <div className="mt-3 text-xs text-red-400">{balance.error}</div>;
  if (balance.currencies.length === 0) {
    return <div className="mt-3 text-xs text-hint">Кошелёк пуст</div>;
  }

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {balance.currencies.map((asset) => (
        <div key={asset.currency} className="rounded-xl border border-white/5 bg-black/10 px-3 py-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <WalletCards className="h-4 w-4 text-accent" />
            {asset.currency}
          </div>
          <div className="mt-1 font-mono text-sm">{formatAmount(asset.total)}</div>
          <div className="mt-1 text-[11px] text-hint">
            Доступно {formatAmount(asset.free)} · В ордерах {formatAmount(asset.used)}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatAmount(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return numeric.toLocaleString("ru-RU", { maximumFractionDigits: 8 });
}
