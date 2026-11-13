// Résumé du jour rédigé automatiquement à partir des données (sans IA, sans clé).

import type { Quote } from "./yahoo";
import type { Coin, FearGreed } from "./coingecko";
import { fmtDate, fmtNumber, fmtPct, fmtPrice } from "./format";
import { upcomingMacro, BANK_SOURCES } from "./calendar";

function move(pct: number | null): string {
  if (pct == null) return "sans cotation";
  const a = Math.abs(pct);
  const up = pct > 0;
  if (a < 0.15) return "quasi stable";
  if (a < 0.6) return up ? "en légère hausse" : "en léger repli";
  if (a < 1.5) return up ? "en hausse" : "en baisse";
  if (a < 3) return up ? "en nette hausse" : "en nette baisse";
  return up ? "en forte hausse" : "en forte baisse";
}

function verb(q: Quote): string {
  const s = q.marketState ?? "";
  if (s === "REGULAR") return "évolue";
  if (s === "PRE" || s === "PREPRE") return "a terminé la veille";
  return "termine";
}

function idx(q: Quote | undefined): string | null {
  if (!q || q.price == null) return null;
  const v = verb(q);
  const m = move(q.changePct);
  const phrase = m === "quasi stable" && v === "évolue" ? "évolue à l'équilibre" : `${v} ${m}`;
  return `le ${q.name} ${phrase} (${fmtPct(q.changePct)}) à ${fmtNumber(q.price, 0)} points`;
}

function others(list: (Quote | undefined)[]): string {
  const parts = list
    .filter((q): q is Quote => Boolean(q && q.changePct != null))
    .map((q) => `${q.name} ${fmtPct(q.changePct)}`);
  return parts.join(", ");
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface DailySummary {
  headline: string;
  paragraphs: string[];
}

export function buildSummary(args: {
  indices: Quote[];
  stocks: Quote[];
  macro: Quote[];
  coins: Coin[];
  fearGreed: FearGreed | null;
  now?: number;
}): DailySummary {
  const now = args.now ?? Date.now();
  const by = new Map([...args.indices, ...args.macro].map((q) => [q.symbol, q]));
  const g = (s: string) => by.get(s);
  const paragraphs: string[] = [];

  // Actions par région
  const eu = idx(g("^FCHI"));
  if (eu) {
    const o = others([g("^STOXX50E"), g("^GDAXI")]);
    paragraphs.push(`En Europe, ${eu}${o ? ` (${o})` : ""}.`);
  }
  const us = idx(g("^GSPC"));
  if (us) {
    const o = others([g("^IXIC"), g("^DJI")]);
    paragraphs.push(`À Wall Street, ${us}${o ? ` (${o})` : ""}.`);
  }
  const asia = idx(g("^N225"));
  if (asia) {
    const o = others([g("^HSI"), g("000001.SS"), g("^KS11")]);
    paragraphs.push(`En Asie, ${asia}${o ? ` (${o})` : ""}.`);
  }

  // Valeurs marquantes
  const movers = args.stocks.filter((q) => q.changePct != null).sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));
  if (movers.length > 4) {
    const top = movers.slice(0, 2);
    const flop = movers.slice(-2).reverse();
    paragraphs.push(
      `Parmi les valeurs suivies, les plus fortes hausses sont ${top.map((q) => `${q.name} (${fmtPct(q.changePct)})`).join(" et ")}, les plus fortes baisses ${flop.map((q) => `${q.name} (${fmtPct(q.changePct)})`).join(" et ")}.`,
    );
  }

  // Crypto
  const btc = args.coins.find((c) => c.id === "bitcoin");
  const eth = args.coins.find((c) => c.id === "ethereum");
  if (btc) {
    let s = `Côté crypto, le bitcoin est ${move(btc.ch24h)} sur 24 h (${fmtPct(btc.ch24h)}) à ${fmtPrice(btc.price, "EUR", 0)}`;
    if (eth) s += `, l'ether ${fmtPct(eth.ch24h)} à ${fmtPrice(eth.price, "EUR", 0)}`;
    s += ".";
    if (args.fearGreed) s += ` L'indice peur / avidité s'établit à ${args.fearGreed.value}/100 (${args.fearGreed.label.toLowerCase()}).`;
    paragraphs.push(s);
  }

  // Matières premières et changes
  const gold = g("GC=F");
  const brent = g("BZ=F");
  const eurusd = g("EURUSD=X");
  const mm: string[] = [];
  if (gold?.price) mm.push(`l'once d'or ${fmtPct(gold.changePct)} à ${fmtPrice(gold.price, "USD", 0)}`);
  if (brent?.price) mm.push(`le Brent ${fmtPct(brent.changePct)} à ${fmtPrice(brent.price, "USD")}`);
  if (eurusd?.price) mm.push(`l'euro vaut ${fmtNumber(eurusd.price, 4)} dollar`);
  if (mm.length) paragraphs.push(`${capitalize(mm.join(", "))}.`);

  // À surveiller
  const next = upcomingMacro(now, 2);
  const soon = args.stocks
    .filter((q) => q.earningsDate && q.earningsDate > now && q.earningsDate < now + 7 * 86400_000)
    .sort((a, b) => (a.earningsDate ?? 0) - (b.earningsDate ?? 0))
    .slice(0, 4);
  const watch: string[] = [];
  if (next.length)
    watch.push(
      next.map((e) => `réunion de la ${e.bank === "BCE" ? "BCE" : BANK_SOURCES[e.bank].name} le ${fmtDate(e.date, { day: "numeric", month: "long" })}`).join(", "),
    );
  if (soon.length)
    watch.push(`résultats de ${soon.map((q) => `${q.name} (${fmtDate(q.earningsDate as number, { day: "numeric", month: "short" })})`).join(", ")}`);
  if (watch.length) paragraphs.push(`À surveiller : ${watch.join(" ; ")}.`);

  // Titre
  const headlineIdx = ["^FCHI", "^STOXX50E", "^GSPC", "^IXIC", "^N225", "^HSI"]
    .map((s) => g(s)?.changePct)
    .filter((v): v is number => v != null);
  const avg = headlineIdx.length ? headlineIdx.reduce((a, b) => a + b, 0) / headlineIdx.length : 0;
  const pos = headlineIdx.filter((v) => v > 0).length;
  let headline =
    avg > 0.5 && pos >= 4
      ? "Les Bourses mondiales dans le vert"
      : avg < -0.5 && pos <= 2
        ? "Les Bourses mondiales dans le rouge"
        : "Séance contrastée sur les marchés";
  if (btc?.ch24h != null) {
    if (btc.ch24h <= -4) headline += ", le bitcoin chute";
    else if (btc.ch24h <= -1.5) headline += ", le bitcoin recule";
    else if (btc.ch24h >= 4) headline += ", le bitcoin s'envole";
    else if (btc.ch24h >= 1.5) headline += ", le bitcoin progresse";
  }
  return { headline, paragraphs };
}
