import type { Metadata } from "next";
import { getQuotes, getSparks } from "@/lib/yahoo";
import { getEurRates, toEur } from "@/lib/fx";
import { quickStockScore } from "@/lib/analysis";
import { SECTORS, STOCKS } from "@/lib/universe";
import { PageTitle } from "@/components/ui";
import { StockScreener, type StockRow } from "@/components/stock-screener";
import { LiveRefresh } from "@/components/live-refresh";

export const metadata: Metadata = { title: "Actions" };
export const revalidate = 120;

export default async function ActionsPage(props: PageProps<"/actions">) {
  const sp = await props.searchParams;
  const [quotes, rates, sparks] = await Promise.all([
    getQuotes(STOCKS.map((s) => s.symbol)),
    getEurRates(),
    getSparks(STOCKS.map((s) => s.symbol), "1mo", "1d"),
  ]);
  const byS = new Map(quotes.map((q) => [q.symbol, q]));
  const rows: StockRow[] = STOCKS.map((s) => {
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
  const sort = typeof sp.tri === "string" ? sp.tri : undefined;
  const region = typeof sp.region === "string" ? sp.region : undefined;
  return (
    <div>
      <PageTitle
        title="Actions"
        subtitle={`${STOCKS.length} grandes valeurs d’Europe, des États-Unis et d’Asie-Pacifique. Triez, filtrez, puis ouvrez une fiche pour l’analyse complète.`}
      >
        <LiveRefresh seconds={120} />
      </PageTitle>
      <StockScreener rows={rows} sectors={SECTORS} initialSort={sort} initialRegion={region} />
    </div>
  );
}
