export function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

export function moneyExact(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export function clampPercent(n: number) {
  if (!Number.isFinite(n)) return 80;
  return Math.min(150, Math.max(25, Math.round(n)));
}

export function lineListPrice(marketMid: number, percent: number, override?: number) {
  if (typeof override === "number" && Number.isFinite(override)) return override;
  return Math.round(marketMid * (clampPercent(percent) / 100) * 100) / 100;
}
