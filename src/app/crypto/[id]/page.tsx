import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getCoinDetail, getCoinHistory, getFearGreed } from "@/lib/coingecko";
import { getChart, getDaily, getMonthly, getSymbolNews, type Bar } from "@/lib/yahoo";
import { analyze } from "@/lib/analysis";
import { backtestScore } from "@/lib/backtest";
import { BacktestView } from "@/components/backtest-view";
import { AssetActions } from "@/components/asset-actions";
import { fmtCompact, fmtDate, fmtNumber, fmtPct, fmtPrice, timeAgo, trendClass } from "@/lib/format";
import { PriceChart } from "@/components/price-chart";
import { AnalysisView, SeasonalityGrid } from "@/components/analysis-view";
import { WatchButton } from "@/components/watch-button";
import { ChangePill, Empty, SectionTitle, Stat } from "@/components/ui";
import { LiveRefresh } from "@/components/live-refresh";
import { Expandable } from "@/components/expandable";

export const revalidate = 120;

export async function generateMetadata(props: PageProps<"/crypto/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const c = await getCoinDetail(id);
  return { title: c ? `${c.name} (${c.symbol})` : id };
}

export default async function CoinPage(props: PageProps<"/crypto/[id]">) {
  const { id } = await props.params;
  const coin = await getCoinDetail(id);
  if (!coin) notFound();

  // Historique long via Yahoo (XXX-EUR) si le symbole correspond bien à cette crypto,
  // sinon 365 jours via CoinGecko.
  const ySym = `${coin.symbol}-EUR`;
  const [yDaily, fng] = await Promise.all([getDaily(ySym, 10), getFearGreed()]);
  const yLast = yDaily[yDaily.length - 1]?.c;
  const yahooOk = Boolean(yLast && coin.price && Math.abs(yLast / coin.price - 1) < 0.08 && yDaily.length > 200);

  let daily: Bar[];
  let monthly: { t: number; c: number }[] = [];
  let initial: { bars: Bar[]; currency: string | null; gmtoffset: number };
  if (yahooOk) {
    [initial, monthly] = await Promise.all([getChart(ySym, "1A"), getMonthly(ySym)]);
    daily = yDaily;
  } else {
    const h = await getCoinHistory(id, 365);
    daily = h.map((p) => ({ t: p.t, o: p.c, h: p.c, l: p.c, c: p.c, v: p.v }));
    initial = { bars: daily, currency: "EUR", gmtoffset: 0 };
  }
  const news = await getSymbolNews(`${coin.name} crypto`);

  const analysis = analyze({ kind: "crypto", daily, monthly, currency: "EUR", fearGreed: fng?.value ?? null });
  const backtest = analysis && yahooOk ? backtestScore(daily, "crypto") : null;

  return (
    <div>
      <nav className="text-sm text-ink-3 mb-4" aria-label="Fil d'Ariane">
        <Link href="/crypto" className="hover:text-ink">
          Crypto
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink-2">{coin.name}</span>
      </nav>

      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-line pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ticker">
            <span>{coin.symbol}</span>
            <span>·</span>
            <span>Crypto</span>
            {coin.rank && (
              <>
                <span>·</span>
                <span>Rang {coin.rank}</span>
              </>
            )}
            {coin.categories.slice(0, 2).map((c) => (
              <span key={c}>· {c}</span>
            ))}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight mt-2 flex items-center gap-3">
            {coin.image && <Image src={coin.image} alt="" width={36} height={36} className="rounded-full" unoptimized />}
            {coin.name}
          </h1>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span className="num text-4xl font-semibold tracking-tight">{fmtPrice(coin.price, "EUR")}</span>
            <ChangePill value={coin.ch24h} />
            <span className="text-sm text-ink-3">sur 24 h</span>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="flex items-center gap-4">
            <LiveRefresh seconds={120} />
            <WatchButton item={{ kind: "coin", id: coin.id, name: coin.name }} />
          </div>
          <AssetActions
            kind="coin"
            symbol={coin.id}
            name={coin.name}
            price={coin.price}
            currency="EUR"
            compareSymbol={yahooOk ? ySym : null}
            benchmark={ySym === "BTC-EUR" ? "ETH-EUR" : "BTC-EUR"}
          />
        </div>
      </header>

      <div className="grid gap-12 lg:grid-cols-[1fr_320px] mt-8">
        <div className="min-w-0 space-y-12">
          <section>
            <PriceChart symbol={ySym} initial={initial} daily={daily} fixed={!yahooOk} />
            {!yahooOk && <p className="ticker mt-2">Historique disponible : 12 mois (source CoinGecko).</p>}
          </section>
          {analysis ? <AnalysisView analysis={analysis} currency="€" kind="crypto" withSeasonality={false} /> : <Empty>Historique insuffisant pour calculer une tendance.</Empty>}
          {backtest && <BacktestView backtest={backtest} />}
        </div>

        <aside className="space-y-10 min-w-0">
          <section>
            <SectionTitle>Chiffres clés</SectionTitle>
            <dl className="text-sm">
              <Stat label="Capitalisation" value={fmtCompact(coin.marketCap, "EUR")} />
              <Stat label="Volume 24 h" value={fmtCompact(coin.volume, "EUR")} />
              <Stat label="24 h (bas – haut)" value={`${fmtNumber(coin.low24h)} – ${fmtNumber(coin.high24h)}`} />
              <Stat label="7 jours" value={<span className={trendClass(coin.ch7d)}>{fmtPct(coin.ch7d)}</span>} />
              <Stat label="30 jours" value={<span className={trendClass(coin.ch30d)}>{fmtPct(coin.ch30d)}</span>} />
              <Stat label="1 an" value={<span className={trendClass(coin.ch1y)}>{fmtPct(coin.ch1y)}</span>} />
              <Stat
                label="Record historique"
                value={fmtPrice(coin.ath, "EUR")}
                sub={coin.athDate ? fmtDate(coin.athDate, { month: "short", year: "numeric" }) : undefined}
              />
              <Stat label="Écart au record" value={<span className={trendClass(coin.athChangePct)}>{fmtPct(coin.athChangePct, 1)}</span>} />
              <Stat label="En circulation" value={fmtCompact(coin.circulating)} sub={coin.symbol} />
              {coin.maxSupply != null && (
                <Stat label="Offre maximale" value={fmtCompact(coin.maxSupply)} sub={coin.circulating ? `${Math.round((coin.circulating / coin.maxSupply) * 100)} % émis` : undefined} />
              )}
              {analysis?.stats.rsi != null && <Stat label="RSI 14 jours" value={fmtNumber(analysis.stats.rsi, 0)} />}
            </dl>
          </section>

          {coin.description && (
            <section>
              <SectionTitle>Présentation</SectionTitle>
              <Expandable>
                <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-line">{coin.description}</p>
              </Expandable>
              {coin.homepage && (
                <a href={coin.homepage} target="_blank" rel="noopener noreferrer" className="link text-sm mt-2 inline-block">
                  Site officiel ↗
                </a>
              )}
            </section>
          )}

          <section>
            <SectionTitle>Actualités</SectionTitle>
            <ul>
              {news.slice(0, 8).map((n) => (
                <li key={n.link} className="border-b border-line last:border-0">
                  <a href={n.link} target="_blank" rel="noopener noreferrer" className="block py-3 group">
                    <span className="block text-sm group-hover:text-accent leading-snug">{n.title}</span>
                    <span className="ticker mt-1 block">
                      {n.source} · {timeAgo(n.date)}
                    </span>
                  </a>
                </li>
              ))}
              {!news.length && <Empty>Aucune actualité récente.</Empty>}
            </ul>
          </section>
        </aside>
      </div>
      {analysis?.seasonality && (
        <div className="mt-12">
          <SeasonalityGrid analysis={analysis} kind={"crypto"} />
        </div>
      )}
    </div>
  );
}
