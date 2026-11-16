import type { NextRequest } from "next/server";
import { getQuotes, getSparks } from "@/lib/yahoo";
import { quickStockScore } from "@/lib/analysis";
import { assetClassOf, regionOf, sectorOf } from "@/lib/classify";

export async function GET(req: NextRequest) {
  const symbols = (req.nextUrl.searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && s.length <= 30)
    .slice(0, 60);
  if (!symbols.length) return Response.json({ quotes: [] });
  const withSpark = req.nextUrl.searchParams.get("spark") !== "0";
  const [quotes, sparks] = await Promise.all([getQuotes(symbols), withSpark ? getSparks(symbols, "1mo", "1d") : Promise.resolve({} as Record<string, number[]>)]);
  return Response.json(
    {
      quotes: quotes.map((q) => ({
        ...q,
        score: quickStockScore(q),
        spark: sparks[q.symbol] ?? [],
        assetClass: assetClassOf(q.symbol, q.quoteType),
        region: regionOf(q.symbol),
        sector: sectorOf(q.symbol),
      })),
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
  );
}
