// Classement d'un actif Yahoo (classe d'actifs, région) pour le portefeuille et les listes.

import { COMMODITIES, FOREX, REGION_LABEL, etfDef, indexDef, stockDef } from "./universe";

const SUFFIX_REGION: Record<string, keyof typeof REGION_LABEL> = {
  PA: "europe", AS: "europe", DE: "europe", F: "europe", MI: "europe", MC: "europe", L: "europe", SW: "europe",
  BR: "europe", LS: "europe", CO: "europe", ST: "europe", HE: "europe", OL: "europe", VI: "europe", IR: "europe",
  T: "asie", HK: "asie", SS: "asie", SZ: "asie", KS: "asie", KQ: "asie", TW: "asie", NS: "asie", BO: "asie", AX: "asie", SI: "asie",
};

export function assetClassOf(symbol: string, quoteType: string | null | undefined): string {
  if (etfDef(symbol) || quoteType === "ETF" || quoteType === "MUTUALFUND") return "ETF";
  if (quoteType === "CRYPTOCURRENCY") return "Crypto";
  if (quoteType === "CURRENCY" || FOREX.some((f) => f.symbol === symbol)) return "Devises";
  if (quoteType === "FUTURE" || COMMODITIES.some((f) => f.symbol === symbol)) return "Matières premières";
  if (quoteType === "INDEX" || symbol.startsWith("^")) return "Indices";
  return "Actions";
}

export function regionOf(symbol: string): string | null {
  const def = stockDef(symbol) ?? indexDef(symbol);
  if (def) return REGION_LABEL[def.region];
  const etf = etfDef(symbol);
  if (etf) return etf.category === "Monde" ? "Monde" : etf.category === "États-Unis" ? "États-Unis" : etf.category === "Europe" || etf.category === "France" ? "Europe" : etf.category === "Émergents" || etf.category === "Asie & Japon" ? "Asie & émergents" : etf.category;
  const suffix = symbol.includes(".") ? symbol.split(".").pop()! : "";
  if (!suffix && /^[A-Z]{1,5}$/.test(symbol)) return REGION_LABEL.usa;
  const r = SUFFIX_REGION[suffix];
  return r ? REGION_LABEL[r] : null;
}

export function sectorOf(symbol: string): string | null {
  return stockDef(symbol)?.sector ?? etfDef(symbol)?.category ?? null;
}
