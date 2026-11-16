// Moteur de tendance : combine des signaux factuels et explicables en un score 0–100.
// Aucune « boule de cristal » : chaque facteur est historique, mesurable et affiché.

import { last, lastAt, logReturns, macd, maxDrawdown, mean, rsi, sma, stdev } from "./indicators";
import { fmtNumber, fmtPct, fmtPrice } from "./format";

export type AssetKind = "stock" | "etf" | "index" | "crypto" | "fx" | "commodity";

export interface Signal {
  key: string;
  label: string;
  /** −2 (très défavorable) … +2 (très favorable) */
  score: number;
  weight: number;
  detail: string;
  group: "Tendance" | "Momentum" | "Temps" | "Fondamentaux" | "Sentiment";
}

export interface ProjectionRow {
  label: string;
  days: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  /** Part historique des périodes de même durée terminées en hausse */
  histUp: number | null;
  histMedian: number | null;
  histSamples: number;
}

export interface Seasonality {
  years: { year: number; months: (number | null)[] }[];
  avg: (number | null)[];
  hit: (number | null)[];
  count: number[];
  firstYear: number;
  lastYear: number;
}

export interface FanPoint {
  t: number;
  close?: number;
  p5?: number;
  p25?: number;
  p50?: number;
  p75?: number;
  p95?: number;
}

export interface Analysis {
  score: number;
  verdict: string;
  tone: "up" | "down" | "neutral";
  signals: Signal[];
  risk: { vol: number | null; level: string; maxDD: number | null };
  stats: {
    rsi: number | null;
    sma50: number | null;
    sma200: number | null;
    ret1m: number | null;
    ret3m: number | null;
    ret6m: number | null;
    ret1y: number | null;
  };
  projection: ProjectionRow[];
  fan: FanPoint[];
  seasonality: Seasonality | null;
  dataYears: number;
}

export interface AnalysisInput {
  kind: AssetKind;
  /** Clôtures quotidiennes, ordre chronologique, t en secondes */
  daily: { t: number; c: number }[];
  /** Clôtures mensuelles longues (saisonnalité / probabilités historiques) */
  monthly?: { t: number; c: number }[];
  currency?: string | null;
  fundamentals?: {
    price: number | null;
    targetMean: number | null;
    analysts: number | null;
    recommendationMean: number | null;
    recommendationKey: string | null;
    pe: number | null;
    forwardPe: number | null;
  } | null;
  fearGreed?: number | null;
  now?: number;
}

const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const MONTHS_SHORT = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];

const REC_FR: Record<string, string> = {
  strong_buy: "Achat fort",
  buy: "Achat",
  hold: "Conserver",
  underperform: "Sous-performance",
  sell: "Vente",
  strong_sell: "Vente forte",
  none: "—",
};

export function verdictFor(score: number): { verdict: string; tone: Analysis["tone"] } {
  if (score >= 65) return { verdict: "Haussière", tone: "up" };
  if (score >= 55) return { verdict: "Plutôt haussière", tone: "up" };
  if (score > 45) return { verdict: "Neutre", tone: "neutral" };
  if (score > 35) return { verdict: "Plutôt baissière", tone: "down" };
  return { verdict: "Baissière", tone: "down" };
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function bucket(v: number, strongNeg: number, neg: number, pos: number, strongPos: number): number {
  if (v >= strongPos) return 2;
  if (v >= pos) return 1;
  if (v <= strongNeg) return -2;
  if (v <= neg) return -1;
  return 0;
}

/** Quantiles de la loi normale centrée réduite. */
const Z = { p5: -1.6449, p25: -0.6745, p50: 0, p75: 0.6745, p95: 1.6449 };

export function computeSeasonality(monthly: { t: number; c: number }[], now = Date.now()): Seasonality | null {
  if (monthly.length < 25) return null;
  const nowD = new Date(now);
  const curKey = nowD.getUTCFullYear() * 12 + nowD.getUTCMonth();
  const byYear = new Map<number, (number | null)[]>();
  for (let i = 1; i < monthly.length; i++) {
    const d = new Date(monthly[i].t * 1000 + 15 * 86400_000); // milieu de mois pour éviter les décalages de fuseau
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const prev = monthly[i - 1].c;
    if (!(prev > 0)) continue;
    const r = monthly[i].c / prev - 1;
    if (!byYear.has(y)) byYear.set(y, new Array(12).fill(null));
    (byYear.get(y) as (number | null)[])[m] = r;
    // Mois en cours : affiché mais exclu des moyennes
    if (y * 12 + m === curKey) (byYear.get(y) as (number | null)[] & { partial?: number }).partial = m;
  }
  const years = Array.from(byYear.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, months]) => ({ year, months }));
  const avg: (number | null)[] = [];
  const hit: (number | null)[] = [];
  const count: number[] = [];
  for (let m = 0; m < 12; m++) {
    const vals = years
      .filter((y) => !(y.year * 12 + m >= curKey))
      .map((y) => y.months[m])
      .filter((v): v is number => v != null);
    count.push(vals.length);
    avg.push(vals.length >= 3 ? mean(vals) : null);
    hit.push(vals.length >= 3 ? vals.filter((v) => v > 0).length / vals.length : null);
  }
  return { years, avg, hit, count, firstYear: years[0].year, lastYear: years[years.length - 1].year };
}

/** Part des fenêtres de `months` mois terminées en hausse, sur l'historique mensuel. */
function historicalUp(monthly: { c: number }[], months: number) {
  const rets: number[] = [];
  for (let i = months; i < monthly.length; i++) {
    if (monthly[i - months].c > 0) rets.push(monthly[i].c / monthly[i - months].c - 1);
  }
  if (rets.length < 12) return { up: null, median: null, n: rets.length };
  const sorted = [...rets].sort((a, b) => a - b);
  return { up: rets.filter((r) => r > 0).length / rets.length, median: sorted[Math.floor(sorted.length / 2)], n: rets.length };
}

export function analyze(input: AnalysisInput): Analysis | null {
  const now = input.now ?? Date.now();
  const daily = input.daily.filter((d) => d.c > 0);
  if (daily.length < 60) return null;
  const closes = daily.map((d) => d.c);
  const price = closes[closes.length - 1];
  const crypto = input.kind === "crypto";
  const perYear = crypto ? 365 : 252;
  const perMonth = crypto ? 30 : 21;
  const scale = crypto ? 2 : input.kind === "fx" ? 0.35 : 1; // seuils adaptés à la volatilité typique

  const signals: Signal[] = [];
  const s50 = sma(closes, 50);
  const s200 = sma(closes, 200);
  const sma50 = last(s50);
  const sma200 = last(s200);

  // 1. Tendance de fond
  if (sma200 != null) {
    const dist = price / sma200 - 1;
    const prev200 = lastAt(s200, 20);
    const slope = prev200 ? sma200 / prev200 - 1 : 0;
    let sc = 0;
    if (dist > 0) sc += 1;
    else sc -= 1;
    if (slope > 0.002) sc += 1;
    else if (slope < -0.002) sc -= 1;
    signals.push({
      key: "trend",
      group: "Tendance",
      label: "Tendance de fond (moyenne 200 jours)",
      score: clamp(sc, -2, 2),
      weight: 2,
      detail: `Le cours est ${fmtPct(Math.abs(dist) * 100, 1).replace(/^[+−]/, "")} ${dist >= 0 ? "au-dessus" : "en dessous"} de sa moyenne mobile 200 jours (${fmtPrice(sma200, input.currency)}), elle-même ${slope > 0.002 ? "orientée à la hausse" : slope < -0.002 ? "orientée à la baisse" : "plutôt plate"} sur le dernier mois.`,
    });
  }

  // 2. Croisement 50 / 200
  if (sma50 != null && sma200 != null) {
    let crossAgo: number | null = null;
    let crossUp = false;
    for (let k = 1; k < 40; k++) {
      const a50 = lastAt(s50, k);
      const a200 = lastAt(s200, k);
      const b50 = lastAt(s50, k - 1);
      const b200 = lastAt(s200, k - 1);
      if (a50 == null || a200 == null || b50 == null || b200 == null) break;
      if ((a50 - a200) * (b50 - b200) < 0) {
        crossAgo = k;
        crossUp = b50 > b200;
        break;
      }
    }
    const above = sma50 > sma200;
    const sc = crossAgo != null ? (crossUp ? 2 : -2) : above ? 1 : -1;
    signals.push({
      key: "cross",
      group: "Tendance",
      label: "Moyennes 50 / 200 jours",
      score: sc,
      weight: 1,
      detail:
        crossAgo != null
          ? crossUp
            ? `« Croisement doré » il y a ${crossAgo} séances : la moyenne 50 jours vient de passer au-dessus de la 200 jours, signal haussier classique.`
            : `« Croisement de la mort » il y a ${crossAgo} séances : la moyenne 50 jours vient de passer sous la 200 jours, signal baissier classique.`
          : above
            ? "La moyenne 50 jours est au-dessus de la 200 jours : configuration haussière installée."
            : "La moyenne 50 jours est sous la 200 jours : configuration baissière installée.",
    });
  }

  // 3. Momentum 12 mois (hors dernier mois) — facteur documenté dans la recherche académique
  const p1m = lastAt(closes, perMonth);
  const p12m = lastAt(closes, perYear);
  if (p1m && p12m) {
    const r = p1m / p12m - 1;
    signals.push({
      key: "mom12",
      group: "Momentum",
      label: "Dynamique sur 12 mois",
      score: bucket(r, -0.2 * scale, -0.05 * scale, 0.05 * scale, 0.2 * scale),
      weight: 1.5,
      detail: `${fmtPct(r * 100, 1)} entre il y a 12 mois et il y a 1 mois. Les actifs en forte dynamique sur un an ont historiquement eu tendance à poursuivre sur leur lancée (effet « momentum »).`,
    });
  }

  // 4. Momentum 3 mois
  const p3m = lastAt(closes, perMonth * 3);
  if (p3m) {
    const r = price / p3m - 1;
    signals.push({
      key: "mom3",
      group: "Momentum",
      label: "Dynamique sur 3 mois",
      score: bucket(r, -0.12 * scale, -0.03 * scale, 0.03 * scale, 0.12 * scale),
      weight: 1,
      detail: `${fmtPct(r * 100, 1)} sur les 3 derniers mois.`,
    });
  }

  // 5. RSI
  const rsiV = last(rsi(closes, 14));
  if (rsiV != null) {
    let sc = 0;
    let txt = `RSI à ${fmtNumber(rsiV, 0)} : zone neutre, ni excès d'achat ni excès de vente.`;
    if (rsiV >= 75) {
      sc = -2;
      txt = `RSI à ${fmtNumber(rsiV, 0)} : forte zone de surachat. Après une telle hausse, une pause ou une correction est fréquente à court terme.`;
    } else if (rsiV >= 65) {
      sc = -1;
      txt = `RSI à ${fmtNumber(rsiV, 0)} : proche du surachat, le potentiel à court terme se réduit.`;
    } else if (rsiV <= 25) {
      sc = 2;
      txt = `RSI à ${fmtNumber(rsiV, 0)} : forte zone de survente. Un rebond technique est fréquent dans ces conditions.`;
    } else if (rsiV <= 35) {
      sc = 1;
      txt = `RSI à ${fmtNumber(rsiV, 0)} : proche de la survente.`;
    }
    signals.push({ key: "rsi", group: "Momentum", label: "RSI 14 jours (excès)", score: sc, weight: 1, detail: txt });
  }

  // 6. MACD
  const m = macd(closes);
  const h0 = last(m.hist);
  const h1 = lastAt(m.hist, 1);
  if (h0 != null && h1 != null) {
    let crossAgo: number | null = null;
    for (let k = 0; k < 6; k++) {
      const a = lastAt(m.hist, k);
      const b = lastAt(m.hist, k + 1);
      if (a != null && b != null && a * b < 0) {
        crossAgo = k;
        break;
      }
    }
    let sc = h0 > 0 ? 1 : -1;
    if (crossAgo != null) sc = h0 > 0 ? 2 : -2;
    signals.push({
      key: "macd",
      group: "Momentum",
      label: "MACD",
      score: sc,
      weight: 0.75,
      detail:
        crossAgo != null
          ? `Le MACD vient de croiser sa ligne de signal ${h0 > 0 ? "à la hausse" : "à la baisse"} (il y a ${crossAgo === 0 ? "moins d'une séance" : `${crossAgo} séance${crossAgo > 1 ? "s" : ""}`}).`
          : `Le MACD est ${h0 > 0 ? "au-dessus" : "en dessous"} de sa ligne de signal et ${Math.abs(h0) > Math.abs(h1) ? "l'écart se creuse" : "l'écart se resserre"}.`,
    });
  }

  // 7. Saisonnalité
  const seasonality = input.monthly ? computeSeasonality(input.monthly, now) : null;
  if (seasonality) {
    const mo = new Date(now).getUTCMonth();
    const avg = seasonality.avg[mo];
    const hit = seasonality.hit[mo];
    const n = seasonality.count[mo];
    if (avg != null && hit != null && n >= 6) {
      let sc = 0;
      if (avg > 0.025 * scale && hit >= 0.7) sc = 2;
      else if (avg > 0.008 * scale && hit >= 0.6) sc = 1;
      else if (avg < -0.025 * scale && hit <= 0.3) sc = -2;
      else if (avg < -0.008 * scale && hit <= 0.4) sc = -1;
      const ups = Math.round(hit * n);
      signals.push({
        key: "season",
        group: "Temps",
        label: `Saisonnalité de ${MONTHS_FR[mo]}`,
        score: sc,
        weight: 0.75,
        detail: `En ${MONTHS_FR[mo]}, l'actif a progressé ${ups} année${ups > 1 ? "s" : ""} sur ${n} (variation moyenne ${fmtPct(avg * 100, 1)}).`,
      });
    }
  }

  // 8. Analystes (actions)
  const f = input.fundamentals;
  if (input.kind === "stock" && f?.targetMean && f.price && (f.analysts ?? 0) >= 3) {
    const up = f.targetMean / f.price - 1;
    let sc = bucket(up, -0.1, -0.02, 0.1, 0.25);
    if (f.recommendationMean != null) {
      if (f.recommendationMean <= 1.8 && sc < 2) sc += 0.5;
      if (f.recommendationMean >= 3 && sc > -2) sc -= 0.5;
    }
    signals.push({
      key: "analysts",
      group: "Fondamentaux",
      label: "Consensus des analystes",
      score: clamp(sc, -2, 2),
      weight: 1.25,
      detail: `${f.analysts} analystes, objectif de cours moyen ${fmtPrice(f.targetMean, input.currency)} (${fmtPct(up * 100, 1)} par rapport au cours actuel). Recommandation moyenne : ${REC_FR[f.recommendationKey ?? "none"] ?? f.recommendationKey}.`,
    });
  }

  // 9. Valorisation (actions)
  if (input.kind === "stock" && f?.pe && f.forwardPe && f.pe > 0 && f.forwardPe > 0) {
    const ratio = f.forwardPe / f.pe;
    let sc = 0;
    if (ratio < 0.85) sc = 1;
    if (ratio > 1.1) sc = -1;
    if (f.forwardPe > 60) sc -= 1;
    signals.push({
      key: "valuation",
      group: "Fondamentaux",
      label: "Valorisation (PER)",
      score: clamp(sc, -2, 2),
      weight: 0.5,
      detail: `PER actuel ${fmtNumber(f.pe, 1)}, PER attendu ${fmtNumber(f.forwardPe, 1)} : les bénéfices sont attendus ${ratio < 0.95 ? "en hausse" : ratio > 1.05 ? "en baisse" : "stables"}${f.forwardPe > 60 ? ", mais la valorisation reste très élevée" : ""}.`,
    });
  }

  // 10. Sentiment (crypto) — lecture contrariante
  if (crypto && input.fearGreed != null) {
    const v = input.fearGreed;
    const sc = v <= 20 ? 1.5 : v <= 35 ? 0.5 : v >= 80 ? -1.5 : v >= 65 ? -0.5 : 0;
    signals.push({
      key: "fng",
      group: "Sentiment",
      label: "Indice peur / avidité",
      score: sc,
      weight: 0.5,
      detail:
        v <= 35
          ? `Indice à ${v}/100 (peur). Lecture contrariante : les phases de peur marquée ont souvent offert de meilleurs points d'entrée que les phases d'euphorie.`
          : v >= 65
            ? `Indice à ${v}/100 (avidité). Lecture contrariante : l'euphorie précède souvent des corrections.`
            : `Indice à ${v}/100 : sentiment neutre.`,
    });
  }

  const wSum = signals.reduce((s, x) => s + x.weight * 2, 0);
  const raw = signals.reduce((s, x) => s + x.weight * x.score, 0);
  const score = wSum ? Math.round(50 + (50 * raw) / wSum) : 50;
  const { verdict, tone } = verdictFor(score);

  // Risque
  const rets = logReturns(closes.slice(-perYear * 2));
  const sigmaD = stdev(rets);
  const vol = sigmaD ? sigmaD * Math.sqrt(perYear) : null;
  const level =
    vol == null ? "—" : vol < 0.15 ? "Faible" : vol < 0.3 ? "Modéré" : vol < 0.6 ? "Élevé" : "Très élevé";
  const mdd = maxDrawdown(closes.slice(-perYear * 3));

  // Projection statistique (modèle log-normal, dérive historique réduite de moitié et bornée)
  const muHist = mean(rets) * perYear;
  const muAnn = clamp(muHist * 0.5, -0.3, 0.3);
  const muD = muAnn / perYear;
  const horizons = [
    { label: "1 mois", days: perMonth, months: 1 },
    { label: "3 mois", days: perMonth * 3, months: 3 },
    { label: "6 mois", days: perMonth * 6, months: 6 },
    { label: "1 an", days: perYear, months: 12 },
  ];
  const projection: ProjectionRow[] = horizons.map((h) => {
    const sd = sigmaD * Math.sqrt(h.days);
    const at = (z: number) => price * Math.exp(muD * h.days + z * sd);
    const hist = input.monthly ? historicalUp(input.monthly, h.months) : { up: null, median: null, n: 0 };
    return {
      label: h.label,
      days: h.days,
      p5: at(Z.p5),
      p25: at(Z.p25),
      p50: at(Z.p50),
      p75: at(Z.p75),
      p95: at(Z.p95),
      histUp: hist.up,
      histMedian: hist.median,
      histSamples: hist.n,
    };
  });

  // Données du graphique en éventail : 6 mois passés + 6 mois projetés
  const fan: FanPoint[] = [];
  const past = daily.slice(-(perMonth * 6));
  for (const d of past) fan.push({ t: d.t, close: d.c });
  const lastT = daily[daily.length - 1].t;
  const stepDays = 7;
  const calDaysPerStep = stepDays;
  const tradingPerCal = perYear / 365;
  fan[fan.length - 1] = { ...fan[fan.length - 1], p5: price, p25: price, p50: price, p75: price, p95: price };
  for (let k = 1; k <= 26; k++) {
    const cal = k * calDaysPerStep;
    const td = cal * tradingPerCal;
    const sd = sigmaD * Math.sqrt(td);
    const at = (z: number) => price * Math.exp(muD * td + z * sd);
    fan.push({ t: lastT + cal * 86400, p5: at(Z.p5), p25: at(Z.p25), p50: at(Z.p50), p75: at(Z.p75), p95: at(Z.p95) });
  }

  const ret = (back: number) => {
    const p = lastAt(closes, back);
    return p ? price / p - 1 : null;
  };

  return {
    score,
    verdict,
    tone,
    signals,
    risk: { vol, level, maxDD: mdd },
    stats: {
      rsi: rsiV,
      sma50,
      sma200,
      ret1m: ret(perMonth),
      ret3m: ret(perMonth * 3),
      ret6m: ret(perMonth * 6),
      ret1y: ret(perYear),
    },
    projection,
    fan,
    seasonality,
    dataYears: input.monthly?.length ? Math.round(input.monthly.length / 12) : Math.round(daily.length / perYear),
  };
}

// ---------- Scores rapides (listes / filtres) ----------

/** Score rapide pour une action, calculé à partir des seules données de cotation. */
export function quickStockScore(q: {
  price: number | null;
  fiftyDayAvg: number | null;
  twoHundredDayAvg: number | null;
  yearChangePct: number | null;
  analystRating: string | null;
  yearHigh: number | null;
  yearLow: number | null;
}): number | null {
  if (!q.price) return null;
  let raw = 0;
  let w = 0;
  const add = (score: number, weight: number) => {
    raw += score * weight;
    w += weight * 2;
  };
  if (q.twoHundredDayAvg) add(q.price > q.twoHundredDayAvg ? 1 : -1, 2);
  if (q.fiftyDayAvg && q.twoHundredDayAvg) add(q.fiftyDayAvg > q.twoHundredDayAvg ? 1 : -1, 1);
  if (q.yearChangePct != null) add(bucket(q.yearChangePct / 100, -0.2, -0.05, 0.05, 0.2), 1.5);
  if (q.fiftyDayAvg) add(bucket(q.price / q.fiftyDayAvg - 1, -0.08, -0.02, 0.02, 0.08), 1);
  const rating = q.analystRating ? parseFloat(q.analystRating) : NaN;
  if (Number.isFinite(rating)) add(rating <= 1.8 ? 2 : rating <= 2.3 ? 1 : rating >= 3.2 ? -1 : 0, 1.25);
  if (!w) return null;
  return Math.round(50 + (50 * raw) / w);
}

/** Score rapide pour une crypto à partir des variations CoinGecko. */
export function quickCoinScore(c: { ch7d: number | null; ch30d: number | null; ch1y: number | null; spark: number[]; price: number }): number | null {
  let raw = 0;
  let w = 0;
  const add = (score: number, weight: number) => {
    raw += score * weight;
    w += weight * 2;
  };
  if (c.ch1y != null) add(bucket(c.ch1y / 100, -0.4, -0.1, 0.1, 0.4), 1.5);
  if (c.ch30d != null) add(bucket(c.ch30d / 100, -0.24, -0.06, 0.06, 0.24), 1);
  if (c.ch7d != null) add(bucket(c.ch7d / 100, -0.1, -0.03, 0.03, 0.1), 0.5);
  if (c.spark.length > 10) add(c.price > mean(c.spark) ? 1 : -1, 0.5);
  if (!w) return null;
  return Math.round(50 + (50 * raw) / w);
}
