import "server-only";
import { getQuotes, getSparks } from "./yahoo";
import { getEurRates, toEur } from "./fx";
import { quickStockScore } from "./analysis";
import { STOCKS } from "./universe";
import type { StockRow } from "@/components/stock-screener";

/** Lignes du filtre d'actions (cotations + capitalisation en euros + score rapide). */
export async function getStockRows(withSparks = true): Promise<StockRow[]> {
  const [quotes, rates, sparks] = await Promise.all([
    getQuotes(STOCKS.map((s) => s.symbol)),
    getEurRates(),
    withSparks ? getSparks(STOCKS.map((s) => s.symbol), "1mo", "1d") : Promise.resolve({} as Record<string, number[]>),
  ]);
  const byS = new Map(quotes.map((q) => [q.symbol, q]));
  return STOCKS.map((s) => {
    const q = byS.get(s.symbol);
    return {
      symbol: s.symbol,
      name: s.name,
      region: s.region,
      country: s.country,
      sector: s.sector,
      price: q?.price ?? null,
      currency: q?.currency ?? null,
      changePct: q?.changePct ?? null,
      yearChangePct: q?.yearChangePct ?? null,
      capEur: toEur(q?.marketCap ?? null, q?.currency ?? null, rates, true),
      pe: q?.pe ?? null,
      dividendYield: q?.dividendYield ?? null,
      score: q ? quickStockScore(q) : null,
      spark: sparks[s.symbol] ?? [],
      marketState: q?.marketState ?? null,
    };
  });
}
