import type { DividendSummary } from "@/lib/dividends";
import { frequencyLabel } from "@/lib/dividends";
import { fmtDate, fmtNumber, fmtPct, fmtPrice, renderTime } from "@/lib/format";
import { SectionTitle, Stat } from "./ui";

/** Dividendes : chiffres clés + histogramme des montants versés par année. */
export function DividendsView({
  summary,
  currency,
  yieldPct,
  rate,
  payoutRatio,
  exDate,
  payDate,
  fiveYearAvgYield,
}: {
  summary: DividendSummary;
  currency: string | null;
  yieldPct: number | null;
  rate: number | null;
  payoutRatio: number | null;
  exDate: number | null;
  payDate: number | null;
  fiveYearAvgYield: number | null;
}) {
  const years = summary.years.slice(-12);
  const max = Math.max(...years.map((y) => y.total), 0) || 1;
  const now = renderTime();
  const freq = frequencyLabel(summary.frequency);
  return (
    <section>
      <SectionTitle>Dividendes</SectionTitle>
      <div className="grid gap-8 md:grid-cols-[1fr_300px] mt-4">
        <figure>
          <div className="flex items-end gap-[2px] h-40" role="img" aria-label="Dividende versé par année">
            {years.map((y) => (
              <div key={y.year} className="flex-1 h-full flex flex-col justify-end items-center group relative min-w-0">
                <span className="num text-[0.65rem] text-ink-3 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {fmtNumber(y.total, 2)}
                </span>
                <span
                  className="w-full max-w-10 rounded-t-[4px]"
                  style={{
                    height: `${Math.max((y.total / max) * 100, y.total > 0 ? 2 : 0)}%`,
                    background: y.partial ? "var(--chart-band-2)" : "var(--chart-line)",
                  }}
                  title={`${y.year} : ${fmtPrice(y.total, currency, 2)}${y.partial ? " (année en cours)" : ""} · ${y.payments} versement${y.payments > 1 ? "s" : ""}`}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-[2px] mt-1.5 border-t border-line pt-1.5">
            {years.map((y) => (
              <span key={y.year} className="flex-1 text-center ticker min-w-0 truncate">
                {String(y.year).slice(2)}
              </span>
            ))}
          </div>
          <figcaption className="ticker mt-2">
            Montant versé par action et par année civile ({currency ?? "devise de cotation"}). Barre claire : année en cours, incomplète.
          </figcaption>
        </figure>
        <dl className="text-sm">
          {yieldPct != null && <Stat label="Rendement actuel" value={`${fmtNumber(yieldPct, 2)} %`} sub={fiveYearAvgYield != null ? `moy. 5 ans ${fmtNumber(fiveYearAvgYield, 2)} %` : undefined} />}
          {rate != null && <Stat label="Dividende annuel" value={fmtPrice(rate, currency, 2)} />}
          {freq && <Stat label="Fréquence" value={freq} />}
          {summary.cagr5 != null && <Stat label="Croissance sur 5 ans" value={`${fmtPct(summary.cagr5 * 100, 1)} / an`} />}
          {summary.streak > 0 && <Stat label="Sans baisse depuis" value={`${summary.streak} an${summary.streak > 1 ? "s" : ""}`} />}
          {payoutRatio != null && payoutRatio > 0 && (
            <Stat label="Part des bénéfices distribuée" value={`${fmtNumber(payoutRatio * 100, 0)} %`} sub={payoutRatio > 0.9 ? "élevée" : undefined} />
          )}
          {exDate && exDate > now - 86400_000 && <Stat label="Prochain détachement" value={fmtDate(exDate)} />}
          {payDate && payDate > now - 86400_000 && <Stat label="Prochain versement" value={fmtDate(payDate)} />}
          {summary.last && <Stat label="Dernier versement" value={fmtPrice(summary.last.amount, currency, 2)} sub={fmtDate(summary.last.t * 1000)} />}
        </dl>
      </div>
    </section>
  );
}
