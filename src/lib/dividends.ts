// Synthèse de l'historique des dividendes.

export interface DividendYear {
  year: number;
  total: number;
  payments: number;
  /** Année en cours : total encore incomplet */
  partial: boolean;
}

export interface DividendSummary {
  years: DividendYear[];
  /** Croissance annuelle moyenne du dividende sur 5 ans (années complètes) */
  cagr5: number | null;
  /** Nombre d'années complètes consécutives sans baisse du dividende */
  streak: number;
  /** Versements par an (fréquence habituelle) */
  frequency: number | null;
  last: { t: number; amount: number } | null;
}

const FREQ_LABEL: Record<number, string> = { 1: "annuel", 2: "semestriel", 4: "trimestriel", 12: "mensuel" };

export function frequencyLabel(f: number | null): string | null {
  if (!f) return null;
  return FREQ_LABEL[f] ?? `${f} versements par an`;
}

export function summarizeDividends(divs: { t: number; amount: number }[], now = Date.now()): DividendSummary | null {
  if (!divs.length) return null;
  const curYear = new Date(now).getUTCFullYear();
  const by = new Map<number, DividendYear>();
  for (const d of divs) {
    const y = new Date(d.t * 1000).getUTCFullYear();
    const row = by.get(y) ?? { year: y, total: 0, payments: 0, partial: y === curYear };
    row.total += d.amount;
    row.payments += 1;
    by.set(y, row);
  }
  // Années sans versement au milieu de l'historique (dividende suspendu)
  const first = Math.min(...by.keys());
  for (let y = first; y <= curYear; y++) {
    if (!by.has(y)) by.set(y, { year: y, total: 0, payments: 0, partial: y === curYear });
  }
  const years = Array.from(by.values()).sort((a, b) => a.year - b.year);
  const complete = years.filter((y) => !y.partial);

  let cagr5: number | null = null;
  if (complete.length >= 6) {
    const a = complete[complete.length - 6].total;
    const b = complete[complete.length - 1].total;
    if (a > 0 && b > 0) cagr5 = Math.pow(b / a, 1 / 5) - 1;
  }

  let streak = 0;
  for (let i = complete.length - 1; i > 0; i--) {
    // Tolérance de 1 % (arrondis, effets de change sur certaines cotations)
    if (complete[i].total > 0 && complete[i].total >= complete[i - 1].total * 0.99) streak++;
    else break;
  }

  const recent = complete.slice(-3).map((y) => y.payments).filter((p) => p > 0);
  const frequency = recent.length ? Math.round(recent.reduce((s, p) => s + p, 0) / recent.length) : null;
  const lastDiv = divs[divs.length - 1];

  return { years, cagr5, streak, frequency, last: lastDiv ? { t: lastDiv.t, amount: lastDiv.amount } : null };
}
