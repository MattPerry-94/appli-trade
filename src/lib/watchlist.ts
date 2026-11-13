"use client";

import { useSyncExternalStore } from "react";

// Favoris stockés dans le navigateur (pas de compte nécessaire).

export interface WatchItem {
  kind: "asset" | "coin";
  /** symbole Yahoo (asset) ou identifiant CoinGecko (coin) */
  id: string;
  name: string;
}

const KEY = "watchlist";
const listeners = new Set<() => void>();
let cache: WatchItem[] | null = null;
const EMPTY: WatchItem[] = [];

function read(): WatchItem[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as WatchItem[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(items: WatchItem[]) {
  cache = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* stockage indisponible : on garde en mémoire */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useWatchlist() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
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
