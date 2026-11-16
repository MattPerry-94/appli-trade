"use client";

import { useEffect, useState } from "react";
import type { LivePrice } from "./portfolio";

export interface LiveTarget {
  kind: "asset" | "coin";
  symbol: string;
}

interface QuoteJson {
  symbol: string;
  price: number | null;
  currency: string | null;
  changePct: number | null;
  assetClass: string;
  region: string | null;
  sector: string | null;
}

interface CoinJson {
  id: string;
  price: number;
  ch24h: number | null;
}

/** Récupère les cours d'actifs Yahoo et de cryptos CoinGecko, clés « kind:symbol ». */
export async function fetchLivePrices(targets: LiveTarget[]): Promise<Record<string, LivePrice>> {
  const assets = Array.from(new Set(targets.filter((t) => t.kind === "asset").map((t) => t.symbol)));
  const coins = Array.from(new Set(targets.filter((t) => t.kind === "coin").map((t) => t.symbol)));
  const out: Record<string, LivePrice> = {};
  const chunks: string[][] = [];
  for (let i = 0; i < assets.length; i += 60) chunks.push(assets.slice(i, i + 60));
  const [qs, cs] = await Promise.all([
    Promise.all(
      chunks.map((c) =>
        fetch(`/api/quotes?spark=0&symbols=${encodeURIComponent(c.join(","))}`)
          .then((r) => r.json() as Promise<{ quotes: QuoteJson[] }>)
          .then((j) => j.quotes)
          .catch(() => [] as QuoteJson[]),
      ),
    ).then((a) => a.flat()),
    coins.length
      ? fetch(`/api/coins?ids=${encodeURIComponent(coins.join(","))}`)
          .then((r) => r.json() as Promise<{ coins: CoinJson[] }>)
          .then((j) => j.coins)
          .catch(() => [] as CoinJson[])
      : Promise.resolve([] as CoinJson[]),
  ]);
  for (const q of qs) {
    out[`asset:${q.symbol}`] = { price: q.price, currency: q.currency, changePct: q.changePct, assetClass: q.assetClass, region: q.region, sector: q.sector };
  }
  for (const c of cs) {
    out[`coin:${c.id}`] = { price: c.price, currency: "EUR", changePct: c.ch24h, assetClass: "Crypto", region: "Crypto", sector: null };
  }
  return out;
}

/** Cours en direct (rafraîchis toutes les `seconds` secondes quand l'onglet est visible). */
export function useLivePrices(targets: LiveTarget[], seconds = 120) {
  const key = targets
    .map((t) => `${t.kind}:${t.symbol}`)
    .sort()
    .join(",");
  const [live, setLive] = useState<Record<string, LivePrice>>({});
  const [rates, setRates] = useState<Record<string, number>>({ EUR: 1 });
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const list: LiveTarget[] = key
      ? key.split(",").map((k) => {
          const i = k.indexOf(":");
          return { kind: k.slice(0, i) as LiveTarget["kind"], symbol: k.slice(i + 1) };
        })
      : [];
    const load = async () => {
      if (!list.length) return;
      setLoading(true);
      try {
        const [l, r] = await Promise.all([
          fetchLivePrices(list),
          fetch("/api/fx")
            .then((x) => x.json() as Promise<{ rates: Record<string, number> }>)
            .then((j) => j.rates)
            .catch(() => null),
        ]);
        if (!alive) return;
        setLive(l);
        if (r) setRates(r);
        setUpdated(Date.now());
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const id = setInterval(() => document.visibilityState === "visible" && load(), seconds * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [key, seconds]);

  return { live, rates, loading, updated };
}
