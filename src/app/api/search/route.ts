import type { NextRequest } from "next/server";
import { searchSymbols } from "@/lib/yahoo";
import { COMMODITIES, ETFS, FOREX, INDICES, RATES, STOCKS } from "@/lib/universe";

interface Hit {
  rank?: number | null;
  href: string;
  name: string;
  symbol: string;
  type: string;
  exchange: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const LOCAL = [
  ...INDICES.map((i) => ({ symbol: i.symbol, name: i.name, type: "INDEX", exchange: i.country })),
  ...STOCKS.map((s) => ({ symbol: s.symbol, name: s.name, type: "EQUITY", exchange: s.country })),
  ...ETFS.map((s) => ({ symbol: s.symbol, name: s.name, type: "ETF", exchange: s.pea ? "ETF · PEA" : "ETF" })),
  ...FOREX.map((s) => ({ symbol: s.symbol, name: s.name, type: "CURRENCY", exchange: "Forex" })),
  ...COMMODITIES.map((s) => ({ symbol: s.symbol, name: s.name, type: "FUTURE", exchange: "Matières premières" })),
  ...RATES.map((s) => ({ symbol: s.symbol, name: s.name, type: "INDEX", exchange: "Taux" })),
];

async function searchCoins(q: string): Promise<Hit[]> {
  try {
    const headers: Record<string, string> = { accept: "application/json" };
    if (process.env.COINGECKO_API_KEY) headers["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
    const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`, {
      headers,
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const j = (await res.json()) as { coins: { id: string; name: string; symbol: string; market_cap_rank: number | null }[] };
    return j.coins.slice(0, 5).map((c) => ({
      rank: c.market_cap_rank,
      href: `/crypto/${c.id}`,
      name: c.name,
      symbol: c.symbol.toUpperCase(),
      type: "COIN",
      exchange: c.market_cap_rank ? `Rang ${c.market_cap_rank}` : "Crypto",
    }));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  if (!q) return Response.json({ hits: [] });
  const nq = norm(q);

  const local: Hit[] = LOCAL.filter((a) => norm(a.name).includes(nq) || norm(a.symbol).startsWith(nq))
    .slice(0, 6)
    .map((a) => ({ ...a, href: `/actif/${encodeURIComponent(a.symbol)}` }));

  const [yahoo, coins] = await Promise.all([searchSymbols(q), searchCoins(q)]);
  const yahooHits: Hit[] = yahoo
    .filter((h) => h.type !== "CRYPTOCURRENCY") // les cryptos passent par CoinGecko
    .map((h) => ({ ...h, href: `/actif/${encodeURIComponent(h.symbol)}` }));

  const seen = new Set<string>();
  // Cryptos majeures avant les résultats Yahoo, jetons obscurs (actions « tokenisées »…) après
  const major = coins.filter((c) => c.rank != null && c.rank <= 300);
  const minor = coins.filter((c) => !major.includes(c)).slice(0, 2);
  const hits = [...local, ...major, ...yahooHits, ...minor].filter((h) => {
    if (seen.has(h.href)) return false;
    seen.add(h.href);
    return true;
  });
  return Response.json({ hits: hits.slice(0, 12).map(({ href, name, symbol, type, exchange }) => ({ href, name, symbol, type, exchange })) });
}
