"use client";

import { createLocalStore } from "./local-store";
import { isPosition, type Position } from "./portfolio";
import { isAlert, type PriceAlert } from "./alerts";
import { watchlistStore, type WatchItem } from "./watchlist";

const NO_POSITIONS: Position[] = [];
const NO_ALERTS: PriceAlert[] = [];

export const portfolioStore = createLocalStore<Position[]>("portfolio", NO_POSITIONS, (raw) =>
  Array.isArray(raw) ? raw.filter(isPosition) : NO_POSITIONS,
);

export const alertsStore = createLocalStore<PriceAlert[]>("alerts", NO_ALERTS, (raw) =>
  Array.isArray(raw) ? raw.filter(isAlert) : NO_ALERTS,
);

// ---------- Sauvegarde / restauration dans un fichier ----------

export interface Backup {
  app: "boussole";
  version: 1;
  exportedAt: string;
  watchlist: WatchItem[];
  portfolio: Position[];
  alerts: PriceAlert[];
}

export function makeBackup(): Backup {
  return {
    app: "boussole",
    version: 1,
    exportedAt: new Date().toISOString(),
    watchlist: watchlistStore.read(),
    portfolio: portfolioStore.read(),
    alerts: alertsStore.read(),
  };
}

export function downloadBackup() {
  const b = makeBackup();
  const blob = new Blob([JSON.stringify(b, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `boussole-sauvegarde-${b.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Lit un fichier de sauvegarde. Renvoie un résumé ou lève une erreur lisible. */
export function parseBackup(text: string): { watchlist: WatchItem[]; portfolio: Position[]; alerts: PriceAlert[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Ce fichier n’est pas une sauvegarde valide (format JSON attendu).");
  }
  const b = raw as Partial<Backup>;
  if (!b || b.app !== "boussole") throw new Error("Ce fichier ne provient pas de Boussole.");
  const watchlist = (Array.isArray(b.watchlist) ? b.watchlist : []).filter(
    (w): w is WatchItem => !!w && (w.kind === "asset" || w.kind === "coin") && typeof w.id === "string" && typeof w.name === "string",
  );
  const portfolio = (Array.isArray(b.portfolio) ? b.portfolio : []).filter(isPosition);
  const alerts = (Array.isArray(b.alerts) ? b.alerts : []).filter(isAlert);
  return { watchlist, portfolio, alerts };
}

export function restoreBackup(data: { watchlist: WatchItem[]; portfolio: Position[]; alerts: PriceAlert[] }) {
  watchlistStore.write(data.watchlist);
  portfolioStore.write(data.portfolio);
  alertsStore.write(data.alerts);
}
