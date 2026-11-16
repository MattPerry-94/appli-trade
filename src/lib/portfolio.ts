// Portefeuille : types et calculs (sans dépendance au navigateur, donc testables).

export interface Position {
  id: string;
  kind: "asset" | "coin";
  /** Symbole Yahoo (asset) ou identifiant CoinGecko (coin) */
  symbol: string;
  name: string;
  quantity: number;
  /** Prix d'achat unitaire, dans la devise de cotation (en euros pour les cryptos) */
  buyPrice: number;
  /** Devise de cotation au moment de l'ajout */
  currency: string;
  /** AAAA-MM-JJ */
  date: string;
  /** Frais d'achat totaux, dans la même devise */
  fees?: number;
}

export interface LivePrice {
  price: number | null;
  currency: string | null;
  changePct: number | null;
  /** Catégorie d'affichage : Actions, ETF, Crypto, Indices, Devises, Matières premières */
  assetClass: string;
  region?: string | null;
  sector?: string | null;
}

export interface PositionView extends Position {
  price: number | null;
  changePct: number | null;
  assetClass: string;
  region: string | null;
  sector: string | null;
  /** Valeurs en euros au taux de change du jour */
  valueEur: number | null;
  costEur: number | null;
  gainEur: number | null;
  /** Plus-value en % dans la devise de cotation (sans effet de change) */
  gainPct: number | null;
  dayGainEur: number | null;
  weight: number | null;
}

export interface PortfolioTotals {
  valueEur: number;
  costEur: number;
  gainEur: number;
  gainPct: number | null;
  dayGainEur: number;
  dayPct: number | null;
  /** Positions dont le cours n'a pas pu être chargé */
  missing: number;
}

/** Convertit un montant dans une devise en euros. `rates` = unités de devise pour 1 €. */
export function eur(value: number, currency: string | null, rates: Record<string, number>): number | null {
  if (!currency) return null;
  let v = value;
  let c = currency;
  if (c === "GBp") {
    c = "GBP";
    v = v / 100;
  }
  const r = rates[c];
  return r ? v / r : null;
}

export function valuePositions(
  positions: Position[],
  live: Record<string, LivePrice | undefined>,
  rates: Record<string, number>,
): { rows: PositionView[]; totals: PortfolioTotals } {
  const rows: PositionView[] = positions.map((p) => {
    const l = live[`${p.kind}:${p.symbol}`];
    const price = l?.price ?? null;
    const cur = l?.currency ?? p.currency;
    const cost = p.quantity * p.buyPrice + (p.fees ?? 0);
    const valueEur = price != null ? eur(p.quantity * price, cur, rates) : null;
    const costEur = eur(cost, p.currency, rates);
    const prev = price != null && l?.changePct != null ? price / (1 + l.changePct / 100) : null;
    const dayGainEur = price != null && prev != null ? eur(p.quantity * (price - prev), cur, rates) : null;
    return {
      ...p,
      price,
      changePct: l?.changePct ?? null,
      assetClass: l?.assetClass ?? (p.kind === "coin" ? "Crypto" : "Actions"),
      region: l?.region ?? null,
      sector: l?.sector ?? null,
      valueEur,
      costEur,
      gainEur: valueEur != null && costEur != null ? valueEur - costEur : null,
      gainPct: price != null && cost > 0 ? ((p.quantity * price) / cost - 1) * 100 : null,
      dayGainEur,
      weight: null,
    };
  });
  const valued = rows.filter((r) => r.valueEur != null);
  const valueEur = valued.reduce((s, r) => s + (r.valueEur as number), 0);
  const costEur = valued.reduce((s, r) => s + (r.costEur ?? 0), 0);
  const dayGainEur = valued.reduce((s, r) => s + (r.dayGainEur ?? 0), 0);
  for (const r of rows) r.weight = r.valueEur != null && valueEur > 0 ? r.valueEur / valueEur : null;
  const prevValue = valueEur - dayGainEur;
  return {
    rows,
    totals: {
      valueEur,
      costEur,
      gainEur: valueEur - costEur,
      gainPct: costEur > 0 ? (valueEur / costEur - 1) * 100 : null,
      dayGainEur,
      dayPct: prevValue > 0 ? (dayGainEur / prevValue) * 100 : null,
      missing: rows.length - valued.length,
    },
  };
}

/** Répartition de la valeur selon une clé (classe d'actifs, région…), triée par poids décroissant. */
export function breakdown(rows: PositionView[], key: (r: PositionView) => string | null): { label: string; value: number; weight: number }[] {
  const map = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    if (r.valueEur == null) continue;
    const k = key(r) ?? "Autre";
    map.set(k, (map.get(k) ?? 0) + r.valueEur);
    total += r.valueEur;
  }
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value, weight: total ? value / total : 0 }))
    .sort((a, b) => b.value - a.value);
}

/** Validation souple d'une position lue depuis le stockage ou un fichier importé. */
export function isPosition(x: unknown): x is Position {
  const p = x as Position;
  return (
    !!p &&
    (p.kind === "asset" || p.kind === "coin") &&
    typeof p.symbol === "string" &&
    typeof p.name === "string" &&
    typeof p.quantity === "number" &&
    p.quantity > 0 &&
    typeof p.buyPrice === "number" &&
    p.buyPrice >= 0 &&
    typeof p.id === "string"
  );
}
