import "server-only";

// Statistiques officielles de la Banque centrale européenne (portail de données, sans clé).
// https://data.ecb.europa.eu

export interface EconPoint {
  /** Période ISO : AAAA-MM, AAAA-Qn ou AAAA-MM-JJ */
  period: string;
  /** Horodatage (ms) du début de la période */
  t: number;
  v: number;
}

export interface EconSeries {
  key: string;
  label: string;
  short: string;
  unit: "%";
  frequency: "mensuelle" | "trimestrielle" | "à chaque décision";
  /** Valeur de référence affichée en pointillés (ex. objectif d'inflation) */
  target?: { value: number; label: string };
  /** Série en marches d'escalier (taux directeur) */
  step?: boolean;
  points: EconPoint[];
  source: string;
}

interface SeriesDef {
  key: string;
  label: string;
  short: string;
  frequency: EconSeries["frequency"];
  target?: EconSeries["target"];
  step?: boolean;
}

export const ECB_SERIES: SeriesDef[] = [
  // Jeu « HICP » : remplace « ICP », arrêté par la BCE en février 2026
  { key: "HICP/M.U2.N.000000.4D0.ANR", label: "Inflation dans la zone euro", short: "Inflation zone euro", frequency: "mensuelle", target: { value: 2, label: "objectif BCE 2 %" } },
  { key: "HICP/M.U2.N.XEF000.4D0.ANR", label: "Inflation sous-jacente (hors énergie et alimentation)", short: "Inflation sous-jacente", frequency: "mensuelle", target: { value: 2, label: "2 %" } },
  { key: "HICP/M.FR.N.000000.4D0.ANR", label: "Inflation en France (indice harmonisé)", short: "Inflation France", frequency: "mensuelle", target: { value: 2, label: "2 %" } },
  { key: "FM/B.U2.EUR.4F.KR.DFR.LEV", label: "Taux de dépôt de la BCE", short: "Taux directeur BCE", frequency: "à chaque décision", step: true },
  { key: "IRS/M.FR.L.L40.CI.0000.EUR.N.Z", label: "Taux d'emprunt de l'État français à 10 ans", short: "OAT 10 ans", frequency: "mensuelle" },
  { key: "IRS/M.DE.L.L40.CI.0000.EUR.N.Z", label: "Taux d'emprunt de l'État allemand à 10 ans", short: "Bund 10 ans", frequency: "mensuelle" },
  // I10 : zone euro à 21 pays (Bulgarie incluse depuis 2026) ; les séries I9 ne sont plus toutes mises à jour
  { key: "LFSI/M.I10.S.UNEHRT.TOTAL0.15_74.T", label: "Taux de chômage dans la zone euro", short: "Chômage zone euro", frequency: "mensuelle" },
  { key: "MNA/Q.Y.I10.W2.S1.S1.B.B1GQ._Z._Z._Z.EUR.LR.GY", label: "Croissance du PIB de la zone euro (sur un an)", short: "Croissance PIB", frequency: "trimestrielle" },
];

/** Âge maximal du dernier point avant de signaler une série comme « non mise à jour ». */
export const STALE_AFTER_DAYS: Record<EconSeries["frequency"], number> = {
  mensuelle: 120,
  trimestrielle: 250,
  "à chaque décision": 100000,
};

/** Découpe une ligne CSV en tenant compte des champs entre guillemets (qui peuvent contenir des virgules). */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function periodToTime(p: string): number {
  if (/^\d{4}-Q[1-4]$/.test(p)) {
    const [y, q] = p.split("-Q");
    return Date.UTC(Number(y), (Number(q) - 1) * 3, 1);
  }
  if (/^\d{4}-\d{2}$/.test(p)) return Date.UTC(Number(p.slice(0, 4)), Number(p.slice(5, 7)) - 1, 1);
  const t = Date.parse(p);
  return Number.isNaN(t) ? 0 : t;
}

/** Lecture du format CSV du portail (colonnes TIME_PERIOD et OBS_VALUE). */
export function parseEcbCsv(csv: string): EconPoint[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const head = splitCsvLine(lines[0]);
  const ti = head.indexOf("TIME_PERIOD");
  const vi = head.indexOf("OBS_VALUE");
  if (ti < 0 || vi < 0) return [];
  const out: EconPoint[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const v = parseFloat(cells[vi]);
    const period = cells[ti];
    if (!period || !Number.isFinite(v)) continue;
    out.push({ period, t: periodToTime(period), v });
  }
  return out.sort((a, b) => a.t - b.t);
}

async function fetchSeries(def: SeriesDef, years: number): Promise<EconSeries | null> {
  const start = new Date().getUTCFullYear() - years;
  const url = `https://data-api.ecb.europa.eu/service/data/${def.key}?startPeriod=${start}-01&format=csvdata`;
  try {
    const res = await fetch(url, { headers: { Accept: "text/csv" }, next: { revalidate: 21600 } });
    if (!res.ok) return null;
    let points = parseEcbCsv(await res.text());
    // Taux directeur : ne garder que les changements de niveau (+ point de départ)
    if (def.step) points = points.filter((p, i) => i === 0 || p.v !== points[i - 1].v);
    if (!points.length) return null;
    // Taux directeur : prolonger le dernier niveau jusqu'à aujourd'hui
    if (def.step) {
      const today = new Date().toISOString().slice(0, 10);
      const lastP = points[points.length - 1];
      if (lastP.period < today) points = [...points, { period: today, t: Date.parse(today), v: lastP.v }];
    }
    return { ...def, unit: "%", points, source: `https://data.ecb.europa.eu/data/datasets/${def.key.split("/")[0]}/${def.key.replace("/", ".")}` };
  } catch (e) {
    console.error("[ecb]", def.key, (e as Error).message);
    return null;
  }
}

export async function getEconomy(years = 6): Promise<EconSeries[]> {
  const all = await Promise.all(ECB_SERIES.map((d) => fetchSeries(d, years)));
  return all.filter((s): s is EconSeries => s != null);
}

/** Valeur un an avant le dernier point (ou la plus proche avant). */
export function yearAgo(s: EconSeries): EconPoint | null {
  const lastT = s.points[s.points.length - 1]?.t;
  if (lastT == null) return null;
  const target = lastT - 365 * 86400_000;
  let best: EconPoint | null = null;
  for (const p of s.points) if (p.t <= target + 20 * 86400_000) best = p;
  return best;
}
