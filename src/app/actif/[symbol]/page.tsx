import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getChart, getDaily, getDividends, getFundamentals, getMonthly, getQuote, getSymbolNews, type Fundamentals, type Quote } from "@/lib/yahoo";
import { backtestScore } from "@/lib/backtest";
import { summarizeDividends } from "@/lib/dividends";
import { analyze, type AssetKind } from "@/lib/analysis";
import { autoDigits, renderTime, fmtCompact, fmtDate, fmtDateTime, fmtNumber, fmtPct, fmtPrice, fmtSigned, timeAgo, trendClass } from "@/lib/format";
import { etfDef, indexDef, stockDef, REGION_LABEL } from "@/lib/universe";
import { PriceChart } from "@/components/price-chart";
import { AnalysisView, SeasonalityGrid } from "@/components/analysis-view";
import { WatchButton } from "@/components/watch-button";
import { Badge, ChangePill, Empty, MarketState, SectionTitle, Stat } from "@/components/ui";
import { BacktestView } from "@/components/backtest-view";
import { DividendsView } from "@/components/dividends-view";
import { AssetActions } from "@/components/asset-actions";
import { LiveRefresh } from "@/components/live-refresh";
import { Expandable } from "@/components/expandable";

export const revalidate = 60;

function kindOf(q: Quote): AssetKind {
  switch (q.quoteType) {
    case "EQUITY":
      return "stock";
    case "ETF":
    case "MUTUALFUND":
      return "etf";
    case "CURRENCY":
      return "fx";
    case "FUTURE":
      return "commodity";
    case "CRYPTOCURRENCY":
      return "crypto";
    default:
      return "index";
  }
}

const KIND_LABEL: Record<AssetKind, string> = {
  stock: "Action",
  etf: "ETF",
  index: "Indice",
  fx: "Devise",
  commodity: "Matière première",
  crypto: "Crypto",
};

export async function generateMetadata(props: PageProps<"/actif/[symbol]">): Promise<Metadata> {
  const { symbol } = await props.params;
  const q = await getQuote(decodeURIComponent(symbol));
  return { title: q ? `${q.name} (${q.symbol})` : decodeURIComponent(symbol) };
}

export default async function AssetPage(props: PageProps<"/actif/[symbol]">) {
  const { symbol: raw } = await props.params;
  const symbol = decodeURIComponent(raw);
  const quote = await getQuote(symbol);
  if (!quote || quote.price == null) notFound();
  const kind = kindOf(quote);

  const [initial, daily, monthly, fundamentals, news, dividends] = await Promise.all([
    getChart(symbol, "1A"),
    getDaily(symbol, 10),
    getMonthly(symbol),
    kind === "stock" ? getFundamentals(symbol) : Promise.resolve(null),
    getSymbolNews(kind === "stock" ? quote.name : symbol),
    kind === "stock" || kind === "etf" ? getDividends(symbol) : Promise.resolve([]),
  ]);

  const analysis = analyze({
    kind,
    daily,
    monthly,
    currency: quote.currency,
    fundamentals: fundamentals
      ? {
          price: quote.price,
          targetMean: fundamentals.targetMean,
          analysts: fundamentals.analysts,
          recommendationMean: fundamentals.recommendationMean,
          recommendationKey: fundamentals.recommendationKey,
          pe: quote.pe,
          forwardPe: quote.forwardPe,
        }
      : null,
  });

  const backtest = analysis ? backtestScore(daily, kind) : null;
  const divSummary = summarizeDividends(dividends);
  const showDividends = divSummary != null && divSummary.years.some((y) => !y.partial && y.total > 0) && dividends[dividends.length - 1].t * 1000 > renderTime() - 2 * 366 * 86400_000;

  const digits = kind === "fx" ? 4 : undefined;
  const def = stockDef(symbol);
  const idx = indexDef(symbol);
  const etf = etfDef(symbol);
  const section =
    kind === "stock" ? { href: "/actions", label: "Actions" } : kind === "etf" ? { href: "/etf", label: "ETF" } : { href: "/marches", label: "Marchés" };

  return (
    <div>
      <nav className="text-sm text-ink-3 mb-4" aria-label="Fil d'Ariane">
        <Link href={section.href} className="hover:text-ink">
          {section.label}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink-2">{quote.name}</span>
      </nav>

      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between border-b border-line pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ticker">
            <span>{quote.symbol}</span>
            <span>·</span>
            <span>{KIND_LABEL[kind]}</span>
            {quote.exchange && (
              <>
                <span>·</span>
                <span>{quote.exchange}</span>
              </>
            )}
            {(def || idx) && (
              <>
                <span>·</span>
                <span>{REGION_LABEL[(def ?? idx)!.region]}</span>
              </>
            )}
            <MarketState state={quote.marketState} />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight mt-2">{quote.name}</h1>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span className="num text-4xl font-semibold tracking-tight">{fmtPrice(quote.price, quote.currency, digits)}</span>
            <ChangePill value={quote.changePct} />
            <span className={`num text-sm ${trendClass(quote.change)}`}>{fmtSigned(quote.change, digits ?? autoDigits(quote.price ?? 0))} aujourd’hui</span>
          </div>
          <p className="ticker mt-2">
            {quote.time ? `Dernier cours : ${fmtDateTime(quote.time)} (heure de Paris)` : ""} · données éventuellement différées
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="flex items-center gap-4">
            <LiveRefresh seconds={60} />
            <WatchButton item={{ kind: "asset", id: quote.symbol, name: quote.name }} />
          </div>
          <AssetActions
            kind="asset"
            symbol={quote.symbol}
            name={quote.name}
            price={quote.price}
            currency={quote.currency}
            benchmark={kind === "stock" && def?.region === "europe" ? "^STOXX50E" : kind === "stock" && def?.region === "asie" ? "^N225" : "^GSPC"}
          />
        </div>
      </header>

      <div className="grid gap-12 lg:grid-cols-[1fr_320px] mt-8">
        <div className="min-w-0 space-y-12">
          <section>
            <PriceChart symbol={symbol} initial={initial} daily={daily} digits={digits} />
          </section>
          {analysis ? (
            <AnalysisView analysis={analysis} currency={quote.currency} digits={digits} kind={kind} withSeasonality={false} />
          ) : (
            <Empty>Historique insuffisant pour calculer une tendance.</Empty>
          )}
          {backtest && <BacktestView backtest={backtest} />}
          {showDividends && divSummary && (
            <DividendsView
              summary={divSummary}
              currency={quote.currency}
              yieldPct={quote.dividendYield}
              rate={kind === "stock" ? quote.dividendRate : null}
              payoutRatio={fundamentals?.payoutRatio ?? null}
              exDate={fundamentals?.exDividendDate ?? null}
              payDate={fundamentals?.dividendDate ?? quote.dividendDate}
              fiveYearAvgYield={fundamentals?.fiveYearAvgDividendYield ?? null}
            />
          )}
        </div>

        <aside className="space-y-10 min-w-0">
          {(etf || kind === "etf") && (
            <section>
              <SectionTitle>Le fonds</SectionTitle>
              <dl className="text-sm">
                {etf && <Stat label="Indice suivi" value={etf.tracks} />}
                {etf && <Stat label="Émetteur" value={etf.issuer} />}
                <Stat label="Frais courants" value={quote.ter ?? etf?.ter ? `${fmtNumber(quote.ter ?? etf?.ter ?? null, 2)} % / an` : "—"} />
                {etf && <Stat label="Éligible PEA" value={etf.pea ? <Badge tone="accent">Oui</Badge> : "Non (compte-titres)"} />}
                {quote.ytdReturn != null && <Stat label="Depuis le 1er janvier" value={<span className={trendClass(quote.ytdReturn)}>{fmtPct(quote.ytdReturn)}</span>} />}
              </dl>
              <p className="ticker mt-2">À vérifier dans le DIC de l’émetteur avant d’investir.</p>
            </section>
          )}
          <section>
            <SectionTitle>Chiffres clés</SectionTitle>
            <dl className="text-sm">
              <Stat label="Ouverture" value={fmtNumber(quote.open, digits)} />
              <Stat label="Clôture veille" value={fmtNumber(quote.prevClose, digits)} />
              <Stat label="Séance (bas – haut)" value={`${fmtNumber(quote.dayLow, digits)} – ${fmtNumber(quote.dayHigh, digits)}`} />
              <Stat label="52 semaines" value={`${fmtNumber(quote.yearLow, digits)} – ${fmtNumber(quote.yearHigh, digits)}`} />
              <RangeBar low={quote.yearLow} high={quote.yearHigh} value={quote.price} />
              {quote.yearChangePct != null && <Stat label="Variation sur 1 an" value={<span className={trendClass(quote.yearChangePct)}>{fmtPct(quote.yearChangePct)}</span>} />}
              {analysis?.stats.ret3m != null && (
                <Stat label="Variation sur 3 mois" value={<span className={trendClass(analysis.stats.ret3m)}>{fmtPct(analysis.stats.ret3m * 100)}</span>} />
              )}
              {quote.marketCap != null && <Stat label="Capitalisation" value={fmtCompact(quote.marketCap, quote.currency)} />}
              {quote.volume != null && quote.volume > 0 && <Stat label="Volume" value={fmtCompact(quote.volume)} sub={quote.avgVolume ? `moy. ${fmtCompact(quote.avgVolume)}` : undefined} />}
              {quote.pe != null && <Stat label="PER (12 derniers mois)" value={fmtNumber(quote.pe, 1)} />}
              {quote.forwardPe != null && <Stat label="PER attendu" value={fmtNumber(quote.forwardPe, 1)} />}
              {quote.dividendYield != null && <Stat label="Rendement du dividende" value={`${fmtNumber(quote.dividendYield, 2)} %`} />}
              {fundamentals?.beta != null && <Stat label="Bêta" value={fmtNumber(fundamentals.beta, 2)} />}
              {analysis?.stats.rsi != null && <Stat label="RSI 14 jours" value={fmtNumber(analysis.stats.rsi, 0)} />}
            </dl>
          </section>

          {fundamentals && (fundamentals.analysts ?? 0) > 0 && <Analysts f={fundamentals} q={quote} />}

          {fundamentals && <Agenda f={fundamentals} q={quote} />}

          {fundamentals?.description && (
            <section>
              <SectionTitle>Profil</SectionTitle>
              <dl className="text-sm mb-3">
                {fundamentals.sector && <Stat label="Secteur" value={fundamentals.sector} />}
                {fundamentals.industry && <Stat label="Activité" value={fundamentals.industry} />}
                {fundamentals.country && <Stat label="Pays" value={fundamentals.country} />}
                {fundamentals.employees != null && <Stat label="Salariés" value={fmtNumber(fundamentals.employees, 0)} />}
              </dl>
              <Expandable>
                <p className="text-sm text-ink-2 leading-relaxed">{fundamentals.description}</p>
              </Expandable>
              <p className="ticker mt-2">Description fournie en anglais par Yahoo Finance.</p>
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
          <SeasonalityGrid analysis={analysis} kind={kind} />
        </div>
      )}
    </div>
  );
}

function RangeBar({ low, high, value }: { low: number | null; high: number | null; value: number | null }) {
  if (low == null || high == null || value == null || high <= low) return null;
  const pos = Math.min(Math.max((value - low) / (high - low), 0), 1) * 100;
  return (
    <div className="py-3 border-b border-line">
      <div className="relative h-1.5 rounded-full bg-surface-2" aria-hidden>
        <span className="absolute top-1/2 -translate-y-1/2 h-3.5 w-[3px] rounded-sm bg-ink ring-2 ring-surface" style={{ left: `calc(${pos}% - 1.5px)` }} />
      </div>
      <p className="ticker mt-1.5">Position dans la fourchette annuelle : {Math.round(pos)} %</p>
    </div>
  );
}

const REC_FR: Record<string, string> = {
  strong_buy: "Achat fort",
  buy: "Achat",
  hold: "Conserver",
  underperform: "Sous-performance",
  sell: "Vente",
  strong_sell: "Vente forte",
};

function Analysts({ f, q }: { f: Fundamentals; q: Quote }) {
  const t = f.trend.find((x) => x.period === "0m") ?? f.trend[0];
  const total = t ? t.strongBuy + t.buy + t.hold + t.sell + t.strongSell : 0;
  const segs = t
    ? [
        { k: "Achat fort", v: t.strongBuy, c: "var(--up)" },
        { k: "Achat", v: t.buy, c: "color-mix(in srgb, var(--up) 55%, transparent)" },
        { k: "Conserver", v: t.hold, c: "var(--ink-3)" },
        { k: "Vente", v: t.sell, c: "color-mix(in srgb, var(--down) 55%, transparent)" },
        { k: "Vente forte", v: t.strongSell, c: "var(--down)" },
      ]
    : [];
  const lo = f.targetLow;
  const hi = f.targetHigh;
  const span = lo != null && hi != null ? Math.max(hi, q.price ?? hi) - Math.min(lo, q.price ?? lo) : 0;
  const min = lo != null ? Math.min(lo, q.price ?? lo) : 0;
  const at = (v: number) => (span ? ((v - min) / span) * 100 : 50);
  const upside = f.targetMean && q.price ? f.targetMean / q.price - 1 : null;
  return (
    <section>
      <SectionTitle>Analystes</SectionTitle>
      <div className="py-3">
        <div className="flex items-baseline justify-between">
          <span className="font-serif text-xl font-semibold">{REC_FR[f.recommendationKey ?? ""] ?? "—"}</span>
          <span className="text-sm text-ink-3">{f.analysts} avis</span>
        </div>
        {total > 0 && (
          <>
            <div className="mt-3 flex h-2.5 gap-[2px] rounded-full overflow-hidden" role="img" aria-label="Répartition des recommandations">
              {segs.filter((s) => s.v > 0).map((s) => (
                <span key={s.k} style={{ flex: s.v, background: s.c }} title={`${s.k} : ${s.v}`} />
              ))}
            </div>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-ink-2">
              {segs.map((s) => (
                <li key={s.k} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-[2px]" style={{ background: s.c }} aria-hidden />
                  {s.k} <span className="num ml-auto">{s.v}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      {f.targetMean != null && lo != null && hi != null && (
        <div className="pt-3 border-t border-line">
          <div className="flex justify-between text-sm">
            <span className="text-ink-2">Objectif de cours moyen</span>
            <span className="num">
              {fmtPrice(f.targetMean, q.currency)} {upside != null && <span className={trendClass(upside)}>({fmtPct(upside * 100, 1)})</span>}
            </span>
          </div>
          <div className="relative h-10 mt-3" aria-hidden>
            <div className="absolute top-4 h-1.5 rounded-full bg-accent-soft" style={{ left: `${at(lo)}%`, width: `${at(hi) - at(lo)}%` }} />
            <span className="absolute top-[11px] h-3.5 w-[3px] rounded-sm bg-accent" style={{ left: `calc(${at(f.targetMean)}% - 1.5px)` }} />
            {q.price != null && (
              <>
                <span className="absolute top-[9px] h-[18px] w-[3px] rounded-sm bg-ink ring-2 ring-surface" style={{ left: `calc(${at(q.price)}% - 1.5px)` }} />
                <span className="absolute top-7 ticker -translate-x-1/2 whitespace-nowrap" style={{ left: `${at(q.price)}%` }}>
                  cours actuel
                </span>
              </>
            )}
          </div>
          <div className="flex justify-between ticker mt-2">
            <span>Bas {fmtNumber(lo)}</span>
            <span>Haut {fmtNumber(hi)}</span>
          </div>
        </div>
      )}
    </section>
  );
}

function Agenda({ f, q }: { f: Fundamentals; q: Quote }) {
  const items: { d: number; label: string }[] = [];
  const now = renderTime();
  const earn = q.earningsDate ?? f.earningsDates[0];
  if (earn && earn > now - 86400_000) items.push({ d: earn, label: `Publication des résultats${q.earningsEstimate ? " (date estimée)" : ""}` });
  if (f.exDividendDate && f.exDividendDate > now - 86400_000) items.push({ d: f.exDividendDate, label: "Détachement du dividende" });
  if (!items.length) return null;
  return (
    <section>
      <SectionTitle>Prochaines dates</SectionTitle>
      <ul>
        {items
          .sort((a, b) => a.d - b.d)
          .map((i) => (
            <li key={i.label} className="flex gap-4 py-2.5 border-b border-line text-sm">
              <span className="num w-24 shrink-0 text-ink-2">{fmtDate(i.d)}</span>
              <span>{i.label}</span>
            </li>
          ))}
      </ul>
    </section>
  );
}
