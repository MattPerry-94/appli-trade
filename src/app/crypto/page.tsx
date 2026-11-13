import type { Metadata } from "next";
import { getCoins, getFearGreed, getGlobal, isMainCoin } from "@/lib/coingecko";
import { quickCoinScore } from "@/lib/analysis";
import { fmtCompact, fmtNumber } from "@/lib/format";
import { Change, PageTitle } from "@/components/ui";
import { CryptoScreener, type CoinRow } from "@/components/crypto-screener";
import { LiveRefresh } from "@/components/live-refresh";

export const metadata: Metadata = { title: "Crypto" };
export const revalidate = 120;

export default async function CryptoPage() {
  const [coins, global, fng] = await Promise.all([getCoins(), getGlobal(), getFearGreed()]);
  const rows: CoinRow[] = coins.map((c) => ({
    id: c.id,
    symbol: c.symbol,
    name: c.name,
    image: c.image,
    rank: c.rank,
    price: c.price,
    marketCap: c.marketCap,
    volume: c.volume,
    ch1h: c.ch1h,
    ch24h: c.ch24h,
    ch7d: c.ch7d,
    ch30d: c.ch30d,
    ch1y: c.ch1y,
    athChangePct: c.athChangePct,
    spark: c.spark,
    score: quickCoinScore(c),
    main: isMainCoin(c),
  }));

  return (
    <div>
      <PageTitle title="Cryptomonnaies" subtitle="Les 100 premières cryptomonnaies par capitalisation, cotées en euros.">
        <LiveRefresh seconds={120} />
      </PageTitle>

      <dl className="grid grid-cols-2 md:grid-cols-5 border-y border-line mb-8">
        <Kpi label="Capitalisation totale" value={global ? fmtCompact(global.marketCap, "EUR") : "—"} sub={global ? <Change value={global.marketCapChange24h} /> : null} />
        <Kpi label="Volume 24 h" value={global ? fmtCompact(global.volume, "EUR") : "—"} />
        <Kpi label="Part du bitcoin" value={global ? `${fmtNumber(global.btcDominance, 1)} %` : "—"} />
        <Kpi label="Part de l’ether" value={global ? `${fmtNumber(global.ethDominance, 1)} %` : "—"} />
        <Kpi label="Peur / avidité" value={fng ? `${fng.value}/100` : "—"} sub={fng ? <span className="text-ink-2">{fng.label}</span> : null} />
      </dl>

      {rows.length ? (
        <CryptoScreener rows={rows} />
      ) : (
        <p className="py-10 text-center text-ink-3">
          Les cours crypto sont momentanément indisponibles (quota de l’API gratuite CoinGecko). Réessayez dans une minute.
        </p>
      )}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="py-4 pr-4 border-b md:border-b-0 border-line md:border-r last:border-r-0 md:pl-4 md:first:pl-0">
      <dt className="eyebrow">{label}</dt>
      <dd className="num text-xl font-semibold mt-1">
        {value}
        {sub && <span className="ml-2 text-sm font-normal">{sub}</span>}
      </dd>
    </div>
  );
}
