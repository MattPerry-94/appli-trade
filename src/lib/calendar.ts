// Réunions de politique monétaire (jour de la décision).
// Sources officielles : federalreserve.gov, ecb.europa.eu, boj.or.jp, bankofengland.co.uk
// (relevées le 13/11/2026). Les dates 2027 de la Fed sont indicatives jusqu'à confirmation.

export interface MacroEvent {
  date: string; // AAAA-MM-JJ
  bank: "Fed" | "BCE" | "BoJ" | "BoE";
  title: string;
  tentative?: boolean;
}

const fed = (d: string, tentative = false): MacroEvent => ({ date: d, bank: "Fed", title: "Décision de taux de la Réserve fédérale (FOMC)", tentative });
const bce = (d: string): MacroEvent => ({ date: d, bank: "BCE", title: "Décision de politique monétaire de la BCE" });
const boj = (d: string): MacroEvent => ({ date: d, bank: "BoJ", title: "Décision de politique monétaire de la Banque du Japon" });
const boe = (d: string): MacroEvent => ({ date: d, bank: "BoE", title: "Décision de taux de la Banque d'Angleterre" });

export const MACRO_EVENTS: MacroEvent[] = [
  fed("2026-12-09"),
  bce("2026-12-17"),
  boe("2026-12-17"),
  boj("2026-12-18"),
  boj("2027-01-22"),
  fed("2027-01-27", true),
  bce("2027-02-04"),
  boe("2027-02-04"),
  fed("2027-03-17", true),
  bce("2027-03-18"),
  boj("2027-03-18"),
  boe("2027-03-18"),
  fed("2027-04-28", true),
  boj("2027-04-28"),
  bce("2027-04-29"),
  boe("2027-04-29"),
  fed("2027-06-09", true),
  bce("2027-06-10"),
  boj("2027-06-11"),
  boe("2027-06-17"),
  bce("2027-07-22"),
  boj("2027-07-22"),
  fed("2027-07-28", true),
  boe("2027-07-29"),
  bce("2027-09-09"),
  fed("2027-09-15", true),
  boe("2027-09-16"),
  boj("2027-09-22"),
  fed("2027-10-27", true),
  bce("2027-10-28"),
  boj("2027-10-29"),
  boe("2027-11-04"),
  fed("2027-11-17", true),
  bce("2027-12-16"),
  boe("2027-12-16"),
  boj("2027-12-17"),
];

export const BANK_SOURCES: Record<MacroEvent["bank"], { name: string; url: string }> = {
  Fed: { name: "Réserve fédérale américaine", url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm" },
  BCE: { name: "Banque centrale européenne", url: "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html" },
  BoJ: { name: "Banque du Japon", url: "https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm" },
  BoE: { name: "Banque d'Angleterre", url: "https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates" },
};

export function upcomingMacro(now = Date.now(), limit?: number): MacroEvent[] {
  const today = new Date(now).toISOString().slice(0, 10);
  const list = MACRO_EVENTS.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  return limit ? list.slice(0, limit) : list;
}
