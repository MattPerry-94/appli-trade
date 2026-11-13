import type { NextRequest } from "next/server";
import { getCoinsByIds } from "@/lib/coingecko";
import { quickCoinScore } from "@/lib/analysis";

export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]{1,80}$/.test(s))
    .slice(0, 60);
  if (!ids.length) return Response.json({ coins: [] });
  const coins = await getCoinsByIds(ids);
  return Response.json(
    { coins: coins.map((c) => ({ ...c, score: quickCoinScore(c) })) },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } },
  );
}
