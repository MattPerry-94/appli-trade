// Alertes de prix : types et vérification (sans dépendance au navigateur).

export interface PriceAlert {
  id: string;
  kind: "asset" | "coin";
  symbol: string;
  name: string;
  /** « above » : prévenir quand le cours dépasse le seuil ; « below » : quand il passe dessous */
  direction: "above" | "below";
  threshold: number;
  currency: string | null;
  createdAt: number;
  /** Horodatage du déclenchement (l'alerte ne se déclenche qu'une fois) */
  triggeredAt?: number;
  triggeredPrice?: number;
}

export function isTriggered(a: Pick<PriceAlert, "direction" | "threshold">, price: number | null | undefined): boolean {
  if (price == null || !Number.isFinite(price)) return false;
  return a.direction === "above" ? price >= a.threshold : price <= a.threshold;
}

export function isAlert(x: unknown): x is PriceAlert {
  const a = x as PriceAlert;
  return (
    !!a &&
    typeof a.id === "string" &&
    (a.kind === "asset" || a.kind === "coin") &&
    typeof a.symbol === "string" &&
    (a.direction === "above" || a.direction === "below") &&
    typeof a.threshold === "number"
  );
}
