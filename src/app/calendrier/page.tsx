import type { Metadata } from "next";
import Link from "next/link";
import { getFundamentalsMany, getQuotes } from "@/lib/yahoo";
import { BANK_SOURCES, MACRO_EVENTS, upcomingMacro } from "@/lib/calendar";
import { STOCKS, REGION_LABEL, stockDef } from "@/lib/universe";
import { renderTime, fmtDate, fmtNumber } from "@/lib/format";
import { Badge, Empty, PageTitle, SectionTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Calendrier" };
export const revalidate = 3600;

export default async function CalendarPage() {
  const now = renderTime();
  const [quotes, funds] = await Promise.all([getQuotes(STOCKS.map((s) => s.symbol)), getFundamentalsMany(STOCKS.map((s) => s.symbol))]);
  const earnings = quotes
    .filter((q) => q.earningsDate && q.earningsDate > now - 86400_000 && q.earningsDate < now + 75 * 86400_000)
    .sort((a, b) => (a.earningsDate ?? 0) - (b.earningsDate ?? 0));
  const macro = upcomingMacro(now);
  const lastMacro = MACRO_EVENTS.map((e) => e.date).sort().pop() ?? "";
  const macroStale = !lastMacro || new Date(lastMacro).getTime() - now < 90 * 86400_000;

  // Dividendes : détachements (et versements) annoncés dans les 90 prochains jours
  const dividends = quotes
    .map((q) => {
      const f = funds.get(q.symbol);
      const ex = f?.exDividendDate ?? null;
      const pay = f?.dividendDate ?? q.dividendDate;
      const d = ex && ex > now - 86400_000 ? ex : pay && pay > now - 86400_000 ? pay : null;
      return d && d < now + 90 * 86400_000 ? { q, d, isEx: d === ex, pay: pay && pay !== d ? pay : null } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => a.d - b.d);

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
      {macroStale && (
        <p className="mb-8 rounded-md border border-line-strong bg-surface-2 px-4 py-3 text-sm">
          Le calendrier des banques centrales s’arrête au {lastMacro ? fmtDate(lastMacro) : "—"}. Il doit être complété avec les dates de
          l’année suivante (fichier <code className="font-mono text-xs">src/lib/calendar.ts</code>, d’après les sites officiels cités plus bas).
        </p>
      )}
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.3fr]">
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
                    <li key={q.symbol} className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-baseline gap-4 py-2.5 border-b border-line">
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

        <section className="lg:col-span-2">
          <SectionTitle href="/actions" hrefLabel="Filtrer par rendement">
            Dividendes à venir
          </SectionTitle>
          {dividends.length === 0 ? (
            <Empty>Aucun détachement de dividende annoncé dans les 90 prochains jours.</Empty>
          ) : (
            <div className="scroll-x">
              <table className="data-table text-sm min-w-[520px]">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="text-col">Valeur</th>
                    <th className="text-col">Événement</th>
                    <th>Rendement</th>
                  </tr>
                </thead>
                <tbody>
                  {dividends.map(({ q, d, isEx, pay }) => (
                    <tr key={q.symbol}>
                      <td className="text-ink-2">{fmtDate(d, { weekday: "short", day: "numeric", month: "short" })}</td>
                      <td className="text-col">
                        <Link href={`/actif/${encodeURIComponent(q.symbol)}`} className="hover:text-accent">
                          {q.name}
                          <span className="ticker ml-2">{q.symbol}</span>
                        </Link>
                      </td>
                      <td className="text-col text-ink-2">
                        {isEx ? "Détachement" : "Versement"}
                        {pay && <span className="ticker ml-2">versement le {fmtDate(pay, { day: "numeric", month: "short" })}</span>}
                      </td>
                      <td>{q.dividendYield != null ? `${fmtNumber(q.dividendYield, 2)} %` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="ticker mt-3 leading-relaxed">
            Pour toucher le dividende, il faut détenir l’action la veille de la date de détachement. Le cours baisse généralement du montant
            versé ce jour-là.
          </p>
        </section>
      </div>
    </div>
  );
}
