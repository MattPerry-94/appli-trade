import Link from "next/link";
import type { Analysis, AssetKind, Signal } from "@/lib/analysis";
import { MONTHS_SHORT } from "@/lib/analysis";
import { fmtNumber, fmtPct } from "@/lib/format";
import { ScoreBar, SectionTitle } from "./ui";
import { FanChart } from "./fan-chart";

const GROUP_ORDER: Signal["group"][] = ["Tendance", "Momentum", "Temps", "Fondamentaux", "Sentiment"];

function SignalMeter({ score }: { score: number }) {
  // 5 cases de −2 à +2
  const label = score >= 1.5 ? "Très favorable" : score >= 0.5 ? "Favorable" : score <= -1.5 ? "Très défavorable" : score <= -0.5 ? "Défavorable" : "Neutre";
  const tone = score >= 0.5 ? "text-up" : score <= -0.5 ? "text-down" : "text-ink-3";
  return (
    <span className="inline-flex items-center gap-2 shrink-0">
      <span className="flex gap-[2px]" aria-hidden>
        {[-2, -1, 0, 1, 2].map((s) => {
          const on = s === 0 ? Math.abs(score) < 0.5 : s < 0 ? score <= s + 0.5 : score >= s - 0.5;
          const bg = !on ? "bg-surface-2" : s < 0 ? "bg-down" : s > 0 ? "bg-up" : "bg-ink-3";
          return <span key={s} className={`h-2.5 w-3 rounded-[2px] ${bg}`} />;
        })}
      </span>
      <span className={`text-xs w-24 ${tone}`}>{label}</span>
    </span>
  );
}

export function AnalysisView({
  analysis,
  currency,
  digits,
  kind,
  withSeasonality = true,
}: {
  analysis: Analysis;
  currency?: string | null;
  digits?: number;
  kind: AssetKind;
  withSeasonality?: boolean;
}) {
  const groups = GROUP_ORDER.map((g) => ({ g, items: analysis.signals.filter((s) => s.group === g) })).filter((x) => x.items.length);
  const favorable = analysis.signals.filter((s) => s.score >= 0.5).length;
  const unfavorable = analysis.signals.filter((s) => s.score <= -0.5).length;

  return (
    <div className="space-y-12">
      {/* Score */}
      <section>
        <SectionTitle aside={<Link href="/methode" className="link">Méthode</Link>}>Perspectives</SectionTitle>
        <div className="grid gap-8 md:grid-cols-[280px_1fr] mt-5">
          <div>
            <ScoreBar score={analysis.score} />
            <p className="mt-5 text-sm text-ink-2 leading-relaxed">
              {favorable} signal{favorable > 1 ? "s" : ""} favorable{favorable > 1 ? "s" : ""}, {unfavorable} défavorable
              {unfavorable > 1 ? "s" : ""} sur {analysis.signals.length}. Le score résume des faits mesurables (tendance, dynamique,
              saisonnalité{kind === "stock" ? ", analystes" : ""}). Ce n’est ni une garantie ni un conseil.
            </p>
            <dl className="mt-5 text-sm">
              <div className="flex justify-between py-2 border-t border-line">
                <dt className="text-ink-2">Niveau de risque</dt>
                <dd>{analysis.risk.level}</dd>
              </div>
              <div className="flex justify-between py-2 border-t border-line">
                <dt className="text-ink-2">Volatilité annuelle</dt>
                <dd className="num">{analysis.risk.vol != null ? fmtPct(analysis.risk.vol * 100, 1).replace("+", "") : "—"}</dd>
              </div>
              <div className="flex justify-between py-2 border-t border-b border-line">
                <dt className="text-ink-2">Pire baisse (3 ans)</dt>
                <dd className="num text-down">{analysis.risk.maxDD != null ? fmtPct(analysis.risk.maxDD * 100, 1) : "—"}</dd>
              </div>
            </dl>
          </div>
          <div className="space-y-6">
            {groups.map(({ g, items }) => (
              <div key={g}>
                <h3 className="eyebrow mb-1">{g}</h3>
                <ul>
                  {items.map((s) => (
                    <li key={s.key} className="py-3 border-b border-line">
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                        <span className="font-medium">{s.label}</span>
                        <SignalMeter score={s.score} />
                      </div>
                      <p className="mt-1 text-sm text-ink-2 leading-relaxed">{s.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projection */}
      <section>
        <SectionTitle>Fourchettes de prix probables</SectionTitle>
        <p className="mt-3 text-sm text-ink-2 max-w-3xl leading-relaxed">
          Projection statistique fondée sur la volatilité réelle des deux dernières années : elle ne prédit pas la direction,
          elle montre l’amplitude des mouvements à attendre. La colonne « historique » indique, sur tout l’historique
          disponible, la part des périodes de même durée terminées en hausse.
        </p>
        <div className="mt-5">
          <FanChart points={analysis.fan} currency={currency} digits={digits} />
        </div>
        <div className="scroll-x mt-6">
          <table className="data-table text-sm min-w-[540px]">
            <thead>
              <tr>
                <th>Horizon</th>
                <th>1 chance sur 2 entre</th>
                <th>9 chances sur 10 entre</th>
                <th>En hausse (hist.)</th>
                <th>Médiane (hist.)</th>
              </tr>
            </thead>
            <tbody>
              {analysis.projection.map((p) => (
                <tr key={p.label}>
                  <td>{p.label}</td>
                  <td>
                    {fmtNumber(p.p25, digits)} – {fmtNumber(p.p75, digits)}
                  </td>
                  <td className="text-ink-2">
                    {fmtNumber(p.p5, digits)} – {fmtNumber(p.p95, digits)}
                  </td>
                  <td>{p.histUp != null ? `${Math.round(p.histUp * 100)} % des cas` : "—"}</td>
                  <td>{p.histMedian != null ? <span className={p.histMedian >= 0 ? "text-up" : "text-down"}>{fmtPct(p.histMedian * 100, 1)}</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {analysis.projection[0]?.histSamples ? (
          <p className="ticker mt-2">Historique calculé sur environ {analysis.dataYears} ans de données mensuelles.</p>
        ) : null}
      </section>

      {/* Saisonnalité */}
      {withSeasonality && analysis.seasonality && <SeasonalityGrid analysis={analysis} kind={kind} />}
    </div>
  );
}

export function SeasonalityGrid({ analysis, kind }: { analysis: Analysis; kind: AssetKind }) {
  const s = analysis.seasonality!;
  const cap = kind === "crypto" ? 0.3 : kind === "fx" ? 0.03 : 0.08;
  const curMonth = new Date().getUTCMonth();
  const years = [...s.years].reverse().slice(0, 12);
  const bg = (r: number | null) => {
    if (r == null) return undefined;
    const pct = Math.round(Math.min(Math.abs(r) / cap, 1) * 48) + 6;
    return `color-mix(in srgb, ${r >= 0 ? "var(--up)" : "var(--down)"} ${pct}%, transparent)`;
  };
  return (
    <section>
      <SectionTitle>Saisonnalité : variations mois par mois</SectionTitle>
      <p className="mt-3 text-sm text-ink-2 max-w-3xl leading-relaxed">
        Chaque case donne la variation du mois. Les deux dernières lignes résument tout l’historique depuis {s.firstYear} :
        variation moyenne et part des années où le mois a été positif. La colonne du mois en cours est encadrée.
      </p>
      <div className="scroll-x mt-5">
        <table className="w-full min-w-[720px] border-separate border-spacing-[2px] text-[0.72rem] num">
          <thead>
            <tr>
              <th className="text-left font-normal ticker pr-2" />
              {MONTHS_SHORT.map((m, i) => (
                <th key={m} className={`font-normal ticker pb-1 ${i === curMonth ? "text-ink" : ""}`}>
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y.year}>
                <th className="text-left font-normal ticker pr-2">{y.year}</th>
                {y.months.map((r, i) => (
                  <td
                    key={i}
                    className={`h-7 text-center rounded-[3px] ${r == null ? "text-ink-3" : "text-ink"} ${i === curMonth ? "outline outline-1 outline-ink-3" : ""}`}
                    style={{ background: r == null ? "var(--surface-2)" : bg(r) }}
                    title={r == null ? "Pas de donnée" : `${MONTHS_SHORT[i]} ${y.year} : ${fmtPct(r * 100, 1)}`}
                  >
                    {r == null ? "·" : fmtPct(r * 100, 1).replace(" %", "")}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th className="text-left font-medium pr-2 pt-2 text-ink-2 text-[0.72rem]">Moyenne</th>
              {s.avg.map((r, i) => (
                <td key={i} className="h-8 text-center rounded-[3px] font-semibold pt-2" style={{ background: bg(r) }}>
                  {r == null ? "—" : fmtPct(r * 100, 1).replace(" %", "")}
                </td>
              ))}
            </tr>
            <tr>
              <th className="text-left font-medium pr-2 text-ink-2 text-[0.72rem]">% hausse</th>
              {s.hit.map((h, i) => (
                <td key={i} className="h-7 text-center text-ink-2">
                  {h == null ? "—" : `${Math.round(h * 100)} %`}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="ticker mt-2">Valeurs en %. Teinte verte : mois positif ; rouge : négatif ; plus la teinte est soutenue, plus le mouvement est fort.</p>
    </section>
  );
}
