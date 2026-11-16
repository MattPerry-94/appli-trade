import { STALE_AFTER_DAYS, getEconomy, yearAgo, type EconSeries } from "@/lib/ecb";
import { fmtNumber, renderTime } from "@/lib/format";
import { SectionTitle } from "./ui";
import { EconChart } from "./econ-chart";

function periodShort(p: string): string {
  if (/^\d{4}-Q[1-4]$/.test(p)) return `T${p.slice(6)} ${p.slice(0, 4)}`;
  const d = new Date(p.length === 7 ? `${p}-01` : p);
  return d.toLocaleDateString("fr-FR", { month: "short", year: "numeric", ...(p.length > 7 ? { day: "numeric" } : {}), timeZone: "UTC" });
}

/** Phrase de lecture factuelle pour chaque indicateur. */
function reading(s: EconSeries, all: EconSeries[]): string | null {
  const last = s.points[s.points.length - 1]?.v;
  if (last == null) return null;
  const v = fmtNumber(last, 1);
  switch (s.short) {
    case "Inflation zone euro":
    case "Inflation sous-jacente":
    case "Inflation France":
      if (Math.abs(last - 2) <= 0.3) return `${v} % : proche de l’objectif de 2 % de la BCE.`;
      if (last > 2) return `${v} % : au-dessus de l’objectif de 2 %, ce qui pousse plutôt la BCE à maintenir ou relever ses taux.`;
      return `${v} % : sous l’objectif de 2 %, ce qui laisse de la marge à la BCE pour baisser ses taux.`;
    case "Taux directeur BCE":
      return `Rémunération des dépôts des banques à la BCE. Il guide le taux des livrets, des crédits et, indirectement, la valorisation des actions.`;
    case "OAT 10 ans": {
      const bund = all.find((x) => x.short === "Bund 10 ans")?.points.at(-1)?.v;
      return bund != null ? `Écart avec l’Allemagne : ${fmtNumber((last - bund) * 100, 0)} points de base, mesure de la confiance des marchés dans la dette française.` : null;
    }
    case "Bund 10 ans":
      return "Le taux sans risque de référence en zone euro : quand il monte, les placements obligataires deviennent plus attractifs face aux actions.";
    case "Chômage zone euro":
      return `${v} % de la population active : un marché du travail tendu soutient la consommation… et l’inflation.`;
    case "Croissance PIB":
      return last < 0 ? `${v} % sur un an : l’économie de la zone euro se contracte.` : last < 1 ? `${v} % sur un an : croissance faible.` : last < 2 ? `${v} % sur un an : croissance modérée, proche du rythme habituel de la zone euro.` : `${v} % sur un an : croissance soutenue pour la zone euro.`;
  }
  return null;
}

export async function EconomySection() {
  const series = await getEconomy(6);
  if (!series.length) return null;
  const now = renderTime();
  return (
    <section>
      <SectionTitle aside={<a href="https://data.ecb.europa.eu" target="_blank" rel="noopener noreferrer" className="link">Source : BCE</a>}>
        Économie de la zone euro
      </SectionTitle>
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 xl:grid-cols-4 mt-5">
        {series.map((s) => {
          const last = s.points[s.points.length - 1];
          // Pour un taux en escalier, le dernier point est « aujourd'hui » : la date utile est celle du dernier changement
          const lastChange = s.step ? s.points[Math.max(s.points.length - 2, 0)] : last;
          const ago = yearAgo(s);
          const diff = ago ? last.v - ago.v : null;
          const stale = now - last.t > STALE_AFTER_DAYS[s.frequency] * 86400_000;
          return (
            <article key={s.key} className="min-w-0">
              <h3 className="text-sm text-ink-2 leading-snug min-h-[2.5em]">{s.label}</h3>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="num text-2xl font-semibold tracking-tight">{fmtNumber(last.v, 2)} %</span>
                {diff != null && (
                  <span className="num text-xs text-ink-3" title="Variation sur un an, en points de pourcentage">
                    {diff > 0 ? "▲ +" : diff < 0 ? "▼ −" : "■ "}
                    {fmtNumber(Math.abs(diff), 2)} pt sur 1 an
                  </span>
                )}
              </div>
              <p className="ticker mt-0.5">
                {s.step ? `depuis le ${periodShort(lastChange.period)}` : periodShort(last.period)} · {s.frequency}
              </p>
              {stale && <p className="text-xs text-down mt-0.5">Série non mise à jour depuis plusieurs mois : chiffre à vérifier.</p>}
              <div className="mt-2">
                <EconChart points={s.points} target={s.target?.value} step={s.step} label={s.label} />
              </div>
              {reading(s, series) && <p className="mt-2 text-xs text-ink-2 leading-relaxed">{reading(s, series)}</p>}
            </article>
          );
        })}
      </div>
      <p className="ticker mt-4">Données officielles de la Banque centrale européenne, mises à jour toutes les 6 heures. Survolez une courbe pour lire les valeurs.</p>
    </section>
  );
}
