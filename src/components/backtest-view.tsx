import Link from "next/link";
import type { Backtest, BucketStats } from "@/lib/backtest";
import { fmtDate, fmtNumber, fmtPct, trendClass } from "@/lib/format";
import { SectionTitle } from "./ui";

function pct(v: number | null) {
  return v == null ? "—" : `${fmtNumber(v * 100, 0)} %`;
}

/** Phrase de conclusion honnête : le signal a-t-il apporté quelque chose par rapport au hasard ? */
export function backtestVerdict(b: { all: BucketStats; bullish: BucketStats; bearish: BucketStats }): { text: string; tone: "up" | "down" | "neutral" } {
  const base = b.all.upRate;
  const bull = b.bullish.n >= 15 ? b.bullish.upRate : null;
  const bear = b.bearish.n >= 15 ? b.bearish.upRate : null;
  if (base == null) return { text: "Historique insuffisant.", tone: "neutral" };
  const bullEdge = bull != null ? bull - base : 0;
  const bearEdge = bear != null ? base - bear : 0;
  const edge = Math.max(bullEdge, bearEdge);
  const spread = bull != null && bear != null ? bull - bear : null;
  if (spread != null && spread >= 0.1 && edge >= 0.04)
    return { text: "Sur cet actif, le score a été un indicateur utile : les périodes « haussières » ont nettement plus souvent été suivies de hausses que les périodes « baissières ».", tone: "up" };
  if (spread != null && spread >= 0.03)
    return { text: "Sur cet actif, le score a eu une utilité modeste : un léger avantage par rapport au hasard, à ne pas surinterpréter.", tone: "neutral" };
  if (spread != null && spread <= -0.05)
    return { text: "Sur cet actif, le score a plutôt donné de faux signaux : les phases « baissières » ont souvent été suivies de rebonds. Prudence avec la lecture de tendance ici.", tone: "down" };
  return { text: "Sur cet actif, le score n’a pas apporté d’avantage clair par rapport au hasard. Il décrit la tendance actuelle sans la prédire de façon fiable.", tone: "neutral" };
}

export function BacktestTable({ rows }: { rows: { label: string; s: BucketStats; hint?: string }[] }) {
  return (
    <div className="scroll-x">
      <table className="data-table text-sm min-w-[480px]">
        <thead>
          <tr>
            <th>Score à l’époque</th>
            <th>Cas</th>
            <th>En hausse 3 mois après</th>
            <th>Variation médiane</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td>
                <span className="font-medium">{r.label}</span>
                {r.hint && <span className="ticker ml-2">{r.hint}</span>}
              </td>
              <td className="text-ink-2">{fmtNumber(r.s.n, 0)}</td>
              <td>
                <span className="inline-flex items-center gap-2 justify-end">
                  <span className="relative h-1.5 w-16 rounded-full bg-surface-2 overflow-hidden" aria-hidden>
                    <span className="absolute inset-y-0 left-0 rounded-full bg-ink-3" style={{ width: `${(r.s.upRate ?? 0) * 100}%` }} />
                  </span>
                  <span className="num w-10 text-right">{pct(r.s.upRate)}</span>
                </span>
              </td>
              <td className={`num ${trendClass(r.s.median)}`}>{r.s.median != null ? fmtPct(r.s.median * 100, 1) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BacktestView({ backtest }: { backtest: Backtest }) {
  const v = backtestVerdict(backtest);
  const color = v.tone === "up" ? "text-up" : v.tone === "down" ? "text-down" : "text-ink";
  return (
    <section>
      <SectionTitle aside={<Link href="/methode#fiabilite" className="link">Comment lire ce test ?</Link>}>Fiabilité du score sur cet actif</SectionTitle>
      <p className={`mt-4 font-serif text-lg leading-snug max-w-3xl ${color}`}>{v.text}</p>
      <p className="mt-2 text-sm text-ink-2 leading-relaxed max-w-3xl">
        Test rétrospectif : chaque semaine du {fmtDate(backtest.from * 1000, { month: "short", year: "numeric" })} au{" "}
        {fmtDate(backtest.to * 1000, { month: "short", year: "numeric" })}, on a recalculé la partie technique du score (tendance, moyennes,
        dynamiques, RSI, MACD) avec les seules données connues à cette date, puis relevé l’évolution du cours {backtest.horizonLabel} plus tard.
      </p>
      <div className="mt-4">
        <BacktestTable
          rows={[
            { label: "Haussier", hint: "≥ 55", s: backtest.bullish },
            { label: "Neutre", hint: "46–54", s: backtest.neutral },
            { label: "Baissier", hint: "≤ 45", s: backtest.bearish },
            { label: "Toutes périodes", hint: "référence", s: backtest.all },
          ]}
        />
      </div>
      <p className="ticker mt-2">
        Les observations se chevauchent (fenêtres de 3 mois relevées chaque semaine) : les écarts de quelques points ne sont pas
        significatifs. Hors analystes et saisonnalité, qui ne sont pas historisés.
      </p>
    </section>
  );
}
