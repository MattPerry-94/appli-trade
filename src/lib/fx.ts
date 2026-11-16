import "server-only";
import { getQuotes } from "./yahoo";

const CURRENCIES = ["USD", "GBP", "JPY", "CHF", "CNY", "HKD", "KRW", "INR", "TWD", "AUD", "DKK", "SEK", "NOK", "CAD", "SGD"];

/** Taux : nombre d'unités de devise pour 1 €. */
export async function getEurRates(): Promise<Record<string, number>> {
  const quotes = await getQuotes(CURRENCIES.map((c) => `EUR${c}=X`));
  const rates: Record<string, number> = { EUR: 1 };
  for (const q of quotes) if (q.price) rates[q.symbol.slice(3, 6)] = q.price;
  return rates;
}

/** Convertit un montant en euros (les cotations en pence « GBp » sont gérées). */
export function toEur(value: number | null, currency: string | null, rates: Record<string, number>, isMarketCap = false): number | null {
  if (value == null || !currency) return null;
  let v = value;
  let c = currency;
  if (c === "GBp") {
    c = "GBP";
    if (!isMarketCap) v = v / 100; // les capitalisations sont déjà exprimées en livres
  }
  const r = rates[c];
  return r ? v / r : null;
}
