// Fiabilité historique du score de tendance.
// On recalcule, jour après jour, la partie technique du score (les mêmes règles que `analyze`)
// en n'utilisant que les données disponibles à cette date, puis on regarde ce que le cours
// a fait ensuite. Aucun paramètre n'est ajusté a posteriori.

import { macd, rsi, sma } from "./indicators";
import type { AssetKind } from "./analysis";

function bucket(v: number, strongNeg: number, neg: number, pos: number, strongPos: number): number {
  if (v >= strongPos) return 2;
  if (v >= pos) return 1;
  if (v <= strongNeg) return -2;
  if (v <= neg) return -1;
  return 0;
}

export function periodsFor(kind: AssetKind) {
  const crypto = kind === "crypto";
  return { perYear: crypto ? 365 : 252, perMonth: crypto ? 30 : 21, scale: crypto ? 2 : kind === "fx" ? 0.35 : 1 };
}

/**
 * Score technique (0–100) à chaque date : tendance de fond, croisement 50/200, dynamiques
 * 12 mois et 3 mois, RSI, MACD. `null` tant que l'historique est insuffisant (1 an).
 */
export function technicalScores(closes: number[], kind: AssetKind): (number | null)[] {
  const { perYear, perMonth, scale } = periodsFor(kind);
  const n = closes.length;
  const out: (number | null)[] = new Array(n).fill(null);
  const s50 = sma(closes, 50);
  const s200 = sma(closes, 200);
  const r = rsi(closes, 14);
  const hist = macd(closes).hist;
  let lastCross = -Infinity;
  let lastCrossUp = false;
  let lastMacdCross = -Infinity;

  for (let i = 1; i < n; i++) {
    const a50 = s50[i - 1];
    const a200 = s200[i - 1];
    const b50 = s50[i];
    const b200 = s200[i];
    if (a50 != null && a200 != null && b50 != null && b200 != null && (a50 - a200) * (b50 - b200) < 0) {
      lastCross = i;
      lastCrossUp = b50 > b200;
    }
    const h0 = hist[i];
    const h1 = hist[i - 1];
    if (h0 != null && h1 != null && h0 * h1 < 0) lastMacdCross = i;

    if (b200 == null || b50 == null || i < perYear) continue;
    const price = closes[i];
    let raw = 0;
    let w = 0;
    const add = (score: number, weight: number) => {
      raw += score * weight;
      w += weight * 2;
    };

    // Tendance de fond
    const prev200 = i >= 20 ? s200[i - 20] : null;
    const slope = prev200 ? b200 / prev200 - 1 : 0;
    let trend = price > b200 ? 1 : -1;
    if (slope > 0.002) trend += 1;
    else if (slope < -0.002) trend -= 1;
    add(trend, 2);

    // Croisement 50 / 200
    add(i - lastCross <= 38 ? (lastCrossUp ? 2 : -2) : b50 > b200 ? 1 : -1, 1);

    // Dynamique 12 mois hors dernier mois
    const p1m = closes[i - perMonth];
    const p12m = closes[i - perYear];
    if (p1m && p12m) add(bucket(p1m / p12m - 1, -0.2 * scale, -0.05 * scale, 0.05 * scale, 0.2 * scale), 1.5);

    // Dynamique 3 mois
    const p3m = closes[i - perMonth * 3];
    if (p3m) add(bucket(price / p3m - 1, -0.12 * scale, -0.03 * scale, 0.03 * scale, 0.12 * scale), 1);

    // RSI
    const rv = r[i];
    if (rv != null) add(rv >= 75 ? -2 : rv >= 65 ? -1 : rv <= 25 ? 2 : rv <= 35 ? 1 : 0, 1);

    // MACD
    if (h0 != null && h1 != null) {
      let sc = h0 > 0 ? 1 : -1;
      if (i - lastMacdCross <= 5) sc = h0 > 0 ? 2 : -2;
      add(sc, 0.75);
    }

    out[i] = Math.round(50 + (50 * raw) / w);
  }
  return out;
}

export interface BucketStats {
  /** Nombre d'observations */
  n: number;
  /** Part des cas où le cours était plus haut à l'horizon */
  upRate: number | null;
  /** Variation médiane à l'horizon */
  median: number | null;
}

export interface Backtest {
  horizonLabel: string;
  horizonDays: number;
  from: number; // secondes UNIX de la première observation
  to: number;
  all: BucketStats;
  bullish: BucketStats;
  neutral: BucketStats;
  bearish: BucketStats;
}

function stats(rets: number[]): BucketStats {
  if (!rets.length) return { n: 0, upRate: null, median: null };
  const s = [...rets].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  const median = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  return { n: rets.length, upRate: rets.filter((r) => r > 0).length / rets.length, median };
}

/**
 * Pour chaque date (une observation par semaine pour limiter les doublons),
 * relève le score de l'époque et la variation du cours sur les 3 mois suivants.
 */
export function backtestScore(daily: { t: number; c: number }[], kind: AssetKind, months = 3, step = 5): Backtest | null {
  const rows = daily.filter((d) => d.c > 0);
  const closes = rows.map((d) => d.c);
  const { perMonth } = periodsFor(kind);
  const h = perMonth * months;
  const scores = technicalScores(closes, kind);
  const all: number[] = [];
  const bull: number[] = [];
  const neut: number[] = [];
  const bear: number[] = [];
  let from = 0;
  let to = 0;
  for (let i = 0; i + h < closes.length; i += step) {
    const sc = scores[i];
    if (sc == null) continue;
    const fwd = closes[i + h] / closes[i] - 1;
    if (!from) from = rows[i].t;
    to = rows[i].t;
    all.push(fwd);
    if (sc >= 55) bull.push(fwd);
    else if (sc <= 45) bear.push(fwd);
    else neut.push(fwd);
  }
  if (all.length < 30) return null;
  return {
    horizonLabel: `${months} mois`,
    horizonDays: h,
    from,
    to,
    all: stats(all),
    bullish: stats(bull),
    neutral: stats(neut),
    bearish: stats(bear),
  };
}

/** Agrège plusieurs backtests (même horizon) en pondérant par le nombre d'observations. */
export function mergeBacktests(list: Backtest[]): { all: BucketStats; bullish: BucketStats; neutral: BucketStats; bearish: BucketStats } {
  const merge = (k: "all" | "bullish" | "neutral" | "bearish"): BucketStats => {
    let n = 0;
    let up = 0;
    let med = 0;
    for (const b of list) {
      const s = b[k];
      if (!s.n || s.upRate == null || s.median == null) continue;
      n += s.n;
      up += s.upRate * s.n;
      med += s.median * s.n;
    }
    return n ? { n, upRate: up / n, median: med / n } : { n: 0, upRate: null, median: null };
  };
  return { all: merge("all"), bullish: merge("bullish"), neutral: merge("neutral"), bearish: merge("bearish") };
}
