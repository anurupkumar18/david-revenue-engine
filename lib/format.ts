// Display formatting helpers (UI-facing).

export function fmtUsd(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return `$${n}`;
}

export function fmtUsdRange([lo, hi]: [number, number]): string {
  if (lo === 0 && hi === 0) return "$0";
  if (lo === 0) return `up to ${fmtUsd(hi)}`;
  return `${fmtUsd(lo)}–${fmtUsd(hi)}`;
}

/** Compact dollars for the pipeline ticker, e.g. 124500 -> "$124.5k". */
export function fmtMoneyCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k`;
  return `$${Math.round(n)}`;
}

export function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
