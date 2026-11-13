import Link from "next/link";
import Image from "next/image";
import { getQuotes, getSparks } from "@/lib/yahoo";
import { getCoins, getFearGreed, isMainCoin } from "@/lib/coingecko";
import { getNews } from "@/lib/news";
import { buildSummary } from "@/lib/summary";
import { quickStockScore } from "@/lib/analysis";
import { upcomingMacro } from "@/lib/calendar";
import { COMMODITIES, FOREX, INDICES, RATES, REGION_LABEL, STOCKS, type Region } from "@/lib/universe";
import { renderTime, fmtDate, fmtNumber, fmtPrice, timeAgo } from "@/lib/format";
import { Change, Empty, ScoreBar, SectionTitle, Sparkline } from "@/components/ui";
import { QuoteList } from "@/components/quote-list";
import { FearGreedCard } from "@/components/fear-greed";
import { LiveRefresh } from "@/components/live-refresh";

export const revalidate = 60;

const REGION_INDICES: Record<Region, string[]> = {
  europe: ["^FCHI", "^STOXX50E", "^GDAXI", "^FTSE"],
  usa: ["^GSPC", "^IXIC", "^DJI", "^RUT"],
  asie: ["^N225", "^HSI", "000001.SS", "^KS11"],
};

export default async function Home() {
  const macroSymbols = [...INDICES, ...FOREX, ...COMMODITIES, ...RATES].map((x) => x.symbol);
  const [macro, stocks, coins, fng, news, sparks] = await Promise.all([
    getQuotes(macroSymbols),
    getQuotes(STOCKS.map((s) => s.symbol)),
    getCoins(),
    getFearGreed(),
    getNews(["marches", "crypto", "asie"]),
    getSparks(Object.values(REGION_INDICES).flat(), "1mo", "1d"),
  ]);
  const bySym = new Map(macro.map((q) => [q.symbol, q]));
  const summary = buildSummary({
    indices: macro.filter((q) => INDICES.some((i) => i.symbol === q.symbol)),
    macro,
    stocks,
    coins,
    fearGreed: fng,
  });

  const movers = stocks.filter((q) => q.changePct != null).sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));
  const gainers = movers.slice(0, 5);
  const losers = movers.slice(-5).reverse();

  const scored = stocks
    .map((q) => ({ q, score: quickStockScore(q) }))
    .filter((x): x is { q: (typeof stocks)[number]; score: number } => x.score != null)
    .sort((a, b) => b.score - a.score);
  const strongest = scored.slice(0, 5);
  const weakest = scored.slice(-5).reverse();

  const topCoins = coins.filter(isMainCoin).slice(0, 8);
  const now = renderTime();
  const earnings = stocks
    .filter((q) => q.earningsDate && q.earningsDate > now - 86400_000 && q.earningsDate < now + 14 * 86400_000)
    .sort((a, b) => (a.earningsDate ?? 0) - (b.earningsDate ?? 0))
    .slice(0, 6);
  const nextMacro = upcomingMacro(now, 4);
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

  return (
    <div className="space-y-12">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow first-letter:uppercase">{today}</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight mt-1">Vue d’ensemble</h1>
        </div>
        <LiveRefresh seconds={60} />
      </header>

      {/* Résumé + sentiment */}
      <section className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <article>
          <p className="eyebrow">Le résumé du jour</p>
          <h2 className="font-serif text-2xl sm:text-[1.75rem] leading-tight font-semibold mt-2 max-w-3xl">{summary.headline}</h2>
          <div className="mt-4 space-y-3 text-[1.02rem] leading-relaxed text-ink-2 max-w-3xl">
            {summary.paragraphs.length ? summary.paragraphs.map((p, i) => <p key={i}>{p}</p>) : <p>Données indisponibles pour le moment.</p>}
          </div>
          <p className="mt-4 ticker">Texte généré automatiquement à partir des cours.</p>
        </article>
        <aside className="lg:border-l lg:border-line lg:pl-8">
          <p className="eyebrow mb-3">Sentiment crypto · peur / avidité</p>
          <FearGreedCard data={fng} />
        </aside>
      </section>

      {/* Indices par région */}
      <section>
        <SectionTitle href="/marches" hrefLabel="Tous les marchés">
          Indices boursiers
        </SectionTitle>
        <div className="grid gap-x-10 gap-y-6 md:grid-cols-3 mt-3">
          {(Object.keys(REGION_INDICES) as Region[]).map((r) => (
            <div key={r}>
              <h3 className="eyebrow py-2">{REGION_LABEL[r]}</h3>
              <QuoteList
                quotes={REGION_INDICES[r].map((s) => bySym.get(s)).filter((q): q is NonNullable<typeof q> => Boolean(q))}
                sparks={sparks}
              />
            </div>
          ))}
        </div>
        <p className="ticker mt-3">Mini-courbes : 1 mois. Ligne pointillée : niveau de départ.</p>
      </section>

      {/* Crypto + variations */}
      <section className="grid gap-10 lg:grid-cols-2">
        <div>
          <SectionTitle href="/crypto" hrefLabel="Top 100">
            Cryptomonnaies
          </SectionTitle>
          {topCoins.length ? (
            <table className="data-table text-sm">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Prix</th>
                  <th>24 h</th>
                  <th className="hidden sm:table-cell">7 jours</th>
                  <th className="hidden sm:table-cell">Tendance 7 j</th>
                </tr>
              </thead>
              <tbody>
                {topCoins.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/crypto/${c.id}`} className="flex items-center gap-2.5 hover:text-accent">
                        <Image src={c.image} alt="" width={18} height={18} className="rounded-full" unoptimized />
                        <span>{c.name}</span>
                        <span className="ticker">{c.symbol}</span>
                      </Link>
                    </td>
                    <td>{fmtPrice(c.price, "EUR")}</td>
                    <td>
                      <Change value={c.ch24h} />
                    </td>
                    <td className="hidden sm:table-cell">
                      <Change value={c.ch7d} />
                    </td>
                    <td className="hidden sm:table-cell">
                      <Sparkline values={c.spark} width={80} height={22} className="ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>Cours crypto indisponibles pour le moment (limite de l’API gratuite atteinte ?).</Empty>
          )}
        </div>
        <div>
          <SectionTitle href="/actions" hrefLabel="Toutes les actions">
            Plus fortes variations du jour
          </SectionTitle>
          <div className="grid sm:grid-cols-2 gap-x-8">
            <MoverList title="Hausses" items={gainers} />
            <MoverList title="Baisses" items={losers} />
          </div>
          <p className="ticker mt-3">Sur les {STOCKS.length} grandes valeurs suivies (Europe, États-Unis, Asie).</p>
        </div>
      </section>

      {/* Tendances + changes/matières */}
      <section className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <SectionTitle href="/actions?tri=score" hrefLabel="Classement complet">
            Tendances les plus marquées
          </SectionTitle>
          <div className="grid sm:grid-cols-2 gap-x-8">
            <ScoreList title="Les plus haussières" items={strongest} />
            <ScoreList title="Les plus baissières" items={weakest} />
          </div>
          <p className="ticker mt-3">
            Score rapide (moyennes mobiles, dynamique 1 an, avis des analystes). <Link href="/methode" className="link">Comment est-il calculé ?</Link>
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-6">
          <div>
            <SectionTitle>Devises</SectionTitle>
            <QuoteList quotes={FOREX.map((f) => bySym.get(f.symbol)).filter((q): q is NonNullable<typeof q> => Boolean(q))} digits={() => 4} />
          </div>
          <div>
            <SectionTitle>Matières premières</SectionTitle>
            <QuoteList quotes={COMMODITIES.map((f) => bySym.get(f.symbol)).filter((q): q is NonNullable<typeof q> => Boolean(q))} digits={() => 2} />
          </div>
        </div>
      </section>

      {/* Actus + agenda */}
      <section className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <SectionTitle href="/actualites" hrefLabel="Toutes les actualités">
            Dernières actualités
          </SectionTitle>
          <ul>
            {news.slice(0, 8).map((n) => (
              <li key={n.link} className="border-b border-line last:border-0">
                <a href={n.link} target="_blank" rel="noopener noreferrer" className="block py-3 group">
                  <span className="block group-hover:text-accent leading-snug">{n.title}</span>
                  <span className="ticker mt-1 block">
                    {n.source} · {timeAgo(n.date)}
                  </span>
                </a>
              </li>
            ))}
            {!news.length && <Empty>Aucune actualité disponible.</Empty>}
          </ul>
        </div>
        <div>
          <SectionTitle href="/calendrier" hrefLabel="Calendrier">
            Agenda
          </SectionTitle>
          <ul>
            {nextMacro.map((e) => (
              <li key={e.date + e.bank} className="flex gap-4 py-2.5 border-b border-line">
                <span className="num w-16 shrink-0 text-ink-2 text-sm">{fmtDate(e.date, { day: "numeric", month: "short" })}</span>
                <span className="text-sm">{e.title}</span>
              </li>
            ))}
            {earnings.map((q) => (
              <li key={q.symbol} className="flex gap-4 py-2.5 border-b border-line">
                <span className="num w-16 shrink-0 text-ink-2 text-sm">{fmtDate(q.earningsDate as number, { day: "numeric", month: "short" })}</span>
                <Link href={`/actif/${encodeURIComponent(q.symbol)}`} className="text-sm hover:text-accent">
                  Résultats de {q.name}
                  {q.earningsEstimate && <span className="text-ink-3"> (date estimée)</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function MoverList({ title, items }: { title: string; items: Awaited<ReturnType<typeof getQuotes>> }) {
  return (
    <div>
      <h3 className="eyebrow py-2">{title}</h3>
      <ul>
        {items.map((q) => (
          <li key={q.symbol} className="border-b border-line last:border-0">
            <Link href={`/actif/${encodeURIComponent(q.symbol)}`} className="flex items-center justify-between gap-3 py-2 hover:text-accent">
              <span className="min-w-0">
                <span className="block truncate text-sm">{q.name}</span>
                <span className="ticker">{q.symbol}</span>
              </span>
              <Change value={q.changePct} className="text-sm" />
            </Link>
          </li>
        ))}
        {!items.length && <Empty>—</Empty>}
      </ul>
    </div>
  );
}

function ScoreList({ title, items }: { title: string; items: { q: Awaited<ReturnType<typeof getQuotes>>[number]; score: number }[] }) {
  return (
    <div>
      <h3 className="eyebrow py-2">{title}</h3>
      <ul>
        {items.map(({ q, score }) => (
          <li key={q.symbol} className="border-b border-line last:border-0">
            <Link href={`/actif/${encodeURIComponent(q.symbol)}`} className="flex items-center justify-between gap-3 py-2 hover:text-accent">
              <span className="min-w-0">
                <span className="block truncate text-sm">{q.name}</span>
                <span className="ticker">
                  {q.symbol} · {fmtNumber(q.price)}
                </span>
              </span>
              <ScoreBar score={score} size="sm" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
