import type { NextRequest } from "next/server";
import { getChart, type RangeKey } from "@/lib/yahoo";

const RANGES: RangeKey[] = ["1J", "5J", "1M", "6M", "1A", "5A", "MAX"];

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const range = req.nextUrl.searchParams.get("range") as RangeKey | null;
  if (!symbol || !range || !RANGES.includes(range) || symbol.length > 30) {
    return Response.json({ error: "Paramètres invalides" }, { status: 400 });
  }
  const data = await getChart(symbol, range);
  return Response.json(data, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
