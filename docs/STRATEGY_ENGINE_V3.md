# Strategy Engine v3

## Инвариант

Для одной запущенной сетки активна ровно одна стратегия: `simple`, `adaptive`
или `reverse`. Стратегии не вызывают и не наследуют торговую логику друг друга.
Капитализация является параметром расчёта следующего BUY, а не стратегией.

## Единый конвейер

```text
exchange event
  -> idempotent fill processing
  -> accounting (quote PnL + optional base PnL)
  -> selected strategy decision
  -> order sizing (capitalization on/off)
  -> risk/market validation
  -> executor
  -> persistence
```

API не создаёт Executor и не размещает ордера. API фиксирует `RUNNING` в БД и
после commit отправляет Worker команду. Только Worker создаёт runtime и строит
начальную сетку.

## Ответственность стратегий

| Стратегия | Накопление | Выход за границу |
|---|---|---|
| Simple | quote | rebuild |
| Adaptive | quote | shift после timeout/cooldown |
| Reverse | base (при сохранении quote-эквивалента) | rebuild |

После BUY зеркальный SELL всегда закрывает фактически купленный объём. После
SELL финансовый результат записывается до попытки создать следующий BUY.

## Капитализация

```text
reinvestment = positive_profit * capitalization_percent / 100
```

- выключена: следующий BUY использует базовый размер;
- включена для Simple/Adaptive: quote-прибыль увеличивает бюджет BUY;
- включена для Reverse: base-прибыль увеличивает количество base;
- `capitalization_max_order_quote` ограничивает итоговый notional;
- отрицательная прибыль никогда не реинвестируется и не скрывается.

## Неизменяемость настроек

Во время `RUNNING`/`STOPPING` можно менять только название. Торговые параметры
требуют полной остановки, поэтому BUY и соответствующий SELL всегда относятся
к одной математической конфигурации.

## Миграция legacy

| Старое значение | Новая стратегия | Капитализация |
|---|---|---|
| simple | simple | off |
| capitalization | simple | on |
| adaptive | adaptive | off |
| adaptive_cap | adaptive | on |
| reverse | reverse | off |
| reverse_cap | reverse | on |
