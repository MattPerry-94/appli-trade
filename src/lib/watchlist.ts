"use client";

import { asArray, createLocalStore } from "./local-store";

// Favoris stockés dans le navigateur (pas de compte nécessaire).

export interface WatchItem {
  kind: "asset" | "coin";
  /** symbole Yahoo (asset) ou identifiant CoinGecko (coin) */
  id: string;
  name: string;
}

const EMPTY: WatchItem[] = [];
export const watchlistStore = createLocalStore<WatchItem[]>("watchlist", EMPTY, asArray);

export function useWatchlist() {
  const items = watchlistStore.use();
  const read = watchlistStore.read;
  const write = watchlistStore.write;
  return {
    items,
    has: (kind: WatchItem["kind"], id: string) => items.some((i) => i.kind === kind && i.id === id),
    toggle: (item: WatchItem) => {
      const cur = read();
      const exists = cur.some((i) => i.kind === item.kind && i.id === item.id);
      write(exists ? cur.filter((i) => !(i.kind === item.kind && i.id === item.id)) : [...cur, item]);
    },
    remove: (kind: WatchItem["kind"], id: string) => write(read().filter((i) => !(i.kind === kind && i.id === id))),
  };
}
