import type { Metadata } from "next";
import Link from "next/link";
import { getQuotes, getSparks, type Quote } from "@/lib/yahoo";
import { quickStockScore } from "@/lib/analysis";
import { COMMODITIES, FOREX, INDICES, RATES, REGION_LABEL, type Region } from "@/lib/universe";
import { fmtNumber, fmtPrice } from "@/lib/format";
import { Change, MarketState, PageTitle, ScoreBar, SectionTitle, Sparkline } from "@/components/ui";
import { WatchButton } from "@/components/watch-button";
import { LiveRefresh } from "@/components/live-refresh";

export const metadata: Metadata = { title: "Marchés" };
export const revalidate = 60;

export default async function MarchesPage() {
  const all = [...INDICES, ...FOREX, ...COMMODITIES, ...RATES].map((x) => x.symbol);
  const [quotes, sparks] = await Promise.all([getQuotes(all), getSparks(all, "3mo", "1d")]);
  const by = new Map(quotes.map((q) => [q.symbol, q]));
  const pick = (syms: string[]) => syms.map((s) => by.get(s)).filter((q): q is Quote => Boolean(q));

  return (
    <div className="space-y-12">
      <PageTitle title="Marchés" subtitle="Indices boursiers des trois grandes zones, devises, matières premières et taux.">
        <LiveRefresh seconds={60} />
      </PageTitle>

      {(["europe", "usa", "asie"] as Region[]).map((r) => (
        <section key={r}>
          <SectionTitle>{REGION_LABEL[r]}</SectionTitle>
          <MarketTable quotes={pick(INDICES.filter((i) => i.region === r).map((i) => i.symbol))} sparks={sparks} countries={Object.fromEntries(INDICES.map((i) => [i.symbol, i.country]))} />
        </section>
      ))}

      <div className="grid gap-12 lg:grid-cols-2">
        <section>
          <SectionTitle>Devises</SectionTitle>
          <MarketTable quotes={pick(FOREX.map((f) => f.symbol))} sparks={sparks} digits={4} compact />
        </section>
        <section>
          <SectionTitle>Matières premières</SectionTitle>
          <MarketTable quotes={pick(COMMODITIES.map((f) => f.symbol))} sparks={sparks} compact withCurrency />
        </section>
      </div>
      <section className="lg:w-1/2 lg:pr-6">
        <SectionTitle>Taux & volatilité</SectionTitle>
        <MarketTable quotes={pick(RATES.map((f) => f.symbol))} sparks={sparks} compact />
        <p className="ticker mt-2">Les taux sont exprimés en %. Le VIX mesure la volatilité attendue sur le S&amp;P 500 : au-dessus de 25–30, le marché est nerveux.</p>
      </section>
      <p className="ticker">Mini-courbes : 3 mois. Score de tendance rapide : moyennes 50/200 jours et dynamique sur 1 an.</p>
    </div>
  );
}

function MarketTable({
  quotes,
  sparks,
  countries,
  digits,
  compact,
  withCurrency,
}: {
  quotes: Quote[];
  sparks: Record<string, number[]>;
  countries?: Record<string, string>;
  digits?: number;
  compact?: boolean;
  withCurrency?: boolean;
}) {
  return (
    <div className="scroll-x">
      <table className="data-table text-sm">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Cours</th>
            <th>Jour</th>
            <th className="hidden sm:table-cell">1 an</th>
            <th className="hidden md:table-cell">3 mois</th>
            {!compact && <th className="hidden md:table-cell">État</th>}
            <th>Tendance</th>
            <th aria-label="Favori" />
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.symbol}>
              <td>
                <Link href={`/actif/${encodeURIComponent(q.symbol)}`} className="hover:text-accent">
                  <span className="font-medium">{q.name}</span>
                  <span className="ticker ml-2">{countries?.[q.symbol] ?? q.symbol}</span>
                </Link>
              </td>
              <td>{withCurrency ? fmtPrice(q.price, q.currency, digits) : fmtNumber(q.price, digits)}</td>
              <td>
                <Change value={q.changePct} />
              </td>
              <td className="hidden sm:table-cell">
                <Change value={q.yearChangePct} digits={1} />
              </td>
              <td className="hidden md:table-cell">
                <Sparkline values={sparks[q.symbol] ?? []} width={88} height={22} className="ml-auto" />
              </td>
              {!compact && (
                <td className="hidden md:table-cell">
                  <MarketState state={q.marketState} />
                </td>
              )}
              <td>
                <ScoreBar score={quickStockScore(q)} size="sm" />
              </td>
              <td className="w-8">
                <WatchButton compact item={{ kind: "asset", id: q.symbol, name: q.name }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
