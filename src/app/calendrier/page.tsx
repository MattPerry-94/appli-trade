import type { Metadata } from "next";
import Link from "next/link";
import { getQuotes } from "@/lib/yahoo";
import { BANK_SOURCES, upcomingMacro } from "@/lib/calendar";
import { STOCKS, REGION_LABEL, stockDef } from "@/lib/universe";
import { renderTime, fmtDate } from "@/lib/format";
import { Badge, Empty, PageTitle, SectionTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Calendrier" };
export const revalidate = 3600;

export default async function CalendarPage() {
  const now = renderTime();
  const quotes = await getQuotes(STOCKS.map((s) => s.symbol));
  const earnings = quotes
    .filter((q) => q.earningsDate && q.earningsDate > now - 86400_000 && q.earningsDate < now + 75 * 86400_000)
    .sort((a, b) => (a.earningsDate ?? 0) - (b.earningsDate ?? 0));
  const macro = upcomingMacro(now);

  // Regroupement des résultats par semaine
  const weeks = new Map<string, typeof earnings>();
  for (const q of earnings) {
    const d = new Date(q.earningsDate as number);
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
    const k = monday.toISOString().slice(0, 10);
    if (!weeks.has(k)) weeks.set(k, []);
    weeks.get(k)!.push(q);
  }

  return (
    <div>
      <PageTitle title="Calendrier" subtitle="Les rendez-vous qui font bouger les marchés : décisions des banques centrales et publications de résultats." />
      <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr]">
        <section>
          <SectionTitle>Banques centrales</SectionTitle>
          <ul>
            {macro.map((e) => (
              <li key={e.date + e.bank} className="grid grid-cols-[6.5rem_1fr] gap-4 py-3 border-b border-line">
                <span className="num text-sm text-ink-2">{fmtDate(e.date, { weekday: "short", day: "numeric", month: "short", year: "2-digit" })}</span>
                <span className="text-sm">
                  <span className="mr-2">
                    <Badge tone="accent">{e.bank}</Badge>
                  </span>
                  {e.title}
                  {e.tentative && <span className="text-ink-3"> (date provisoire)</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="ticker mt-3 leading-relaxed">
            Sources :{" "}
            {Object.entries(BANK_SOURCES).map(([k, s], i) => (
              <span key={k}>
                {i > 0 && " · "}
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="link">
                  {s.name}
                </a>
              </span>
            ))}
            . Dates relevées le 13/11/2026.
          </p>
        </section>

        <section>
          <SectionTitle>Résultats d’entreprises</SectionTitle>
          {weeks.size === 0 && <Empty>Aucune publication annoncée dans les prochaines semaines.</Empty>}
          {Array.from(weeks.entries()).map(([week, list]) => (
            <div key={week} className="mt-4">
              <h3 className="eyebrow py-1">Semaine du {fmtDate(week, { day: "numeric", month: "long" })}</h3>
              <ul>
                {list.map((q) => {
                  const def = stockDef(q.symbol);
                  return (
                    <li key={q.symbol} className="grid grid-cols-[6.5rem_1fr_auto] items-baseline gap-4 py-2.5 border-b border-line">
                      <span className="num text-sm text-ink-2">{fmtDate(q.earningsDate as number, { weekday: "short", day: "numeric", month: "short" })}</span>
                      <Link href={`/actif/${encodeURIComponent(q.symbol)}`} className="text-sm hover:text-accent">
                        {q.name}
                        <span className="ticker ml-2">{q.symbol}</span>
                        {q.earningsEstimate && <span className="text-ink-3 text-xs"> · estimée</span>}
                      </Link>
                      <span className="ticker">{def ? REGION_LABEL[def.region] : ""}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <p className="ticker mt-3">Pour les {STOCKS.length} valeurs suivies. Dates fournies par Yahoo Finance.</p>
        </section>
      </div>
    </div>
  );
}
