// Formatage des nombres et dates à la française.

const cache = new Map<string, Intl.NumberFormat>();
function nf(opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(opts);
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat("fr-FR", opts);
    cache.set(key, f);
  }
  return f;
}

/** Nombre de décimales raisonnable selon l'ordre de grandeur. */
export function autoDigits(v: number): number {
  const a = Math.abs(v);
  if (a === 0) return 2;
  if (a >= 1000) return 2;
  if (a >= 1) return 2;
  if (a >= 0.01) return 4;
  return 6;
}

export function fmtNumber(v: number | null | undefined, digits?: number): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const d = digits ?? autoDigits(v);
  return nf({ minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
}

const SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  GBp: "p",
  JPY: "¥",
  CNY: "¥",
  HKD: "HK$",
  KRW: "₩",
  INR: "₹",
  TWD: "NT$",
  CHF: "CHF",
  DKK: "kr",
  SEK: "kr",
};

export function currencySymbol(c?: string | null): string {
  if (!c) return "";
  return SYMBOLS[c] ?? c;
}

export function fmtPrice(v: number | null | undefined, currency?: string | null, digits?: number): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const s = fmtNumber(v, digits);
  const sym = currencySymbol(currency);
  return sym ? `${s} ${sym}` : s;
}

/** +1,23 % — le signe est toujours affiché (la couleur n'est jamais seule porteuse du sens). */
export function fmtPct(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const s = nf({ minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Math.abs(v));
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${s} %`;
}

export function fmtSigned(v: number | null | undefined, digits?: number): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const s = fmtNumber(Math.abs(v), digits ?? autoDigits(v));
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${s}`;
}

/** 1,23 Md / 456 M / 12,3 k */
export function fmtCompact(v: number | null | undefined, currency?: string | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  let s: string;
  if (a >= 1e11) s = `${fmtNumber(v / 1e9, 0)} Md`;
  else if (a >= 1e9) s = `${fmtNumber(v / 1e9, 1)} Md`;
  else if (a >= 1e6) s = `${fmtNumber(v / 1e6, 1)} M`;
  else if (a >= 1e3) s = `${fmtNumber(v / 1e3, 1)} k`;
  else s = fmtNumber(v, 0);
  const sym = currencySymbol(currency);
  return sym ? `${s} ${sym}` : s;
}

export function trendClass(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v) || v === 0) return "text-ink-2";
  return v > 0 ? "text-up" : "text-down";
}

export function fmtDate(d: Date | number | string, opts?: Intl.DateTimeFormatOptions): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    ...(opts ?? { day: "numeric", month: "short", year: "numeric" }),
  });
}

export function fmtDateTime(d: Date | number | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

export function timeAgo(d: Date | number | string): string {
  const date = d instanceof Date ? d : new Date(d);
  const s = Math.round((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  if (j < 7) return `il y a ${j} j`;
  return fmtDate(date, { day: "numeric", month: "short" });
}

/** Horodatage du rendu serveur (les composants serveur sont rendus une fois par requête). */
export function renderTime(): number {
  return Date.now();
}
