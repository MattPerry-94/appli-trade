"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { alertsStore } from "@/lib/stores";
import { isTriggered, type PriceAlert } from "@/lib/alerts";
import { fetchLivePrices } from "@/lib/use-live-prices";
import { fmtPrice } from "@/lib/format";

const INTERVAL = 120_000;

/** Vérifie les alertes de prix tant qu'un onglet du site est ouvert (aucun serveur ni compte). */
export function AlertWatcher() {
  const alerts = alertsStore.use();
  const [toasts, setToasts] = useState<PriceAlert[]>([]);
  const active = alerts.filter((a) => !a.triggeredAt);
  const key = active.map((a) => a.id).join(",");

  useEffect(() => {
    if (!key) return;
    let alive = true;
    const check = async () => {
      const list = alertsStore.read().filter((a) => !a.triggeredAt);
      if (!list.length) return;
      const live = await fetchLivePrices(list.map((a) => ({ kind: a.kind, symbol: a.symbol })));
      if (!alive) return;
      const now = Date.now();
      const fired: PriceAlert[] = [];
      const next = alertsStore.read().map((a) => {
        if (a.triggeredAt) return a;
        const price = live[`${a.kind}:${a.symbol}`]?.price;
        if (!isTriggered(a, price)) return a;
        const done = { ...a, triggeredAt: now, triggeredPrice: price as number };
        fired.push(done);
        return done;
      });
      if (!fired.length) return;
      alertsStore.write(next);
      setToasts((t) => [...t, ...fired]);
      for (const a of fired) {
        try {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`Boussole · ${a.name}`, {
              body: `${a.direction === "above" ? "A dépassé" : "Est passé sous"} ${fmtPrice(a.threshold, a.currency)} (cours : ${fmtPrice(a.triggeredPrice, a.currency)})`,
              tag: a.id,
            });
          }
        } catch {
          /* notifications indisponibles : le bandeau suffit */
        }
      }
    };
    const first = setTimeout(check, 4000);
    const id = setInterval(check, INTERVAL);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(id);
    };
  }, [key]);

  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((a) => (
        <div key={a.id} className="rounded-lg border border-line-strong bg-surface p-4 shadow-lg text-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">
              <span aria-hidden className="mr-1.5">
                🔔
              </span>
              {a.name}
            </p>
            <button type="button" onClick={() => setToasts((t) => t.filter((x) => x.id !== a.id))} className="text-ink-3 hover:text-ink -mt-1" aria-label="Fermer">
              ×
            </button>
          </div>
          <p className="mt-1 text-ink-2">
            {a.direction === "above" ? "A dépassé" : "Est passé sous"} <span className="num">{fmtPrice(a.threshold, a.currency)}</span> · cours{" "}
            <span className="num">{fmtPrice(a.triggeredPrice, a.currency)}</span>
          </p>
          <Link href={a.kind === "coin" ? `/crypto/${a.symbol}` : `/actif/${encodeURIComponent(a.symbol)}`} className="link text-xs mt-2 inline-block">
            Voir la fiche →
          </Link>
        </div>
      ))}
    </div>
  );
}
