"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { alertsStore } from "@/lib/stores";
import { newId } from "@/lib/local-store";
import { fmtPrice } from "@/lib/format";

interface Props {
  kind: "asset" | "coin";
  /** Symbole Yahoo ou identifiant CoinGecko */
  symbol: string;
  name: string;
  price: number | null;
  currency: string | null;
  /** Symbole Yahoo utilisé par le comparateur (ex. BTC-EUR pour une crypto) */
  compareSymbol?: string | null;
  benchmark?: string;
}

const btn =
  "inline-flex items-center gap-1.5 rounded-md border border-line-strong px-3 py-1.5 text-sm text-ink-2 hover:text-ink hover:border-ink-3 transition-colors";

export function AssetActions({ kind, symbol, name, price, currency, compareSymbol, benchmark = "^GSPC" }: Props) {
  const cmp = compareSymbol === undefined ? symbol : compareSymbol;
  const addHref = `/portefeuille?ajouter=${encodeURIComponent(symbol)}&type=${kind}&nom=${encodeURIComponent(name)}${price != null ? `&prix=${price}` : ""}${currency ? `&devise=${encodeURIComponent(currency)}` : ""}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {cmp && (
        <Link href={`/comparer?s=${encodeURIComponent([cmp, cmp === benchmark ? "^FCHI" : benchmark].join(","))}`} className={btn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M3 17l5-5 4 3 8-9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 20h18" strokeLinecap="round" opacity=".5" />
          </svg>
          Comparer
        </Link>
      )}
      <Link href={addHref} className={btn}>
        <span aria-hidden className="text-base leading-none">+</span> Portefeuille
      </Link>
      <AlertButton kind={kind} symbol={symbol} name={name} price={price} currency={currency} />
    </div>
  );
}

function AlertButton({ kind, symbol, name, price, currency }: Omit<Props, "compareSymbol" | "benchmark">) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [value, setValue] = useState(price != null ? String(Math.round(price * 1.05 * 100) / 100).replace(".", ",") : "");
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const threshold = parseFloat(value.replace(/\s/g, "").replace(",", "."));
  const valid = Number.isFinite(threshold) && threshold > 0;

  const save = async () => {
    if (!valid) return;
    alertsStore.write([
      ...alertsStore.read(),
      { id: newId(), kind, symbol, name, direction, threshold, currency, createdAt: Date.now() },
    ]);
    try {
      if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission();
    } catch {
      /* notifications non prises en charge */
    }
    setDone(true);
    setTimeout(() => {
      setOpen(false);
      setDone(false);
    }, 1400);
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" className={btn} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z" strokeLinejoin="round" />
          <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
        </svg>
        Alerte
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-lg border border-line-strong bg-surface p-4 shadow-lg text-sm">
          {done ? (
            <p className="text-up">✓ Alerte enregistrée. Gérez-la depuis la page Favoris.</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
              className="space-y-3"
            >
              <p className="font-medium">Me prévenir quand {name}</p>
              <div className="flex rounded-md border border-line p-0.5" role="radiogroup" aria-label="Sens">
                {(
                  [
                    ["above", "dépasse"],
                    ["below", "passe sous"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={direction === k}
                    onClick={() => setDirection(k)}
                    className={`flex-1 px-2 py-1 rounded ${direction === k ? "bg-ink text-bg" : "text-ink-2"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="block">
                <span className="text-ink-2">Seuil {currency ? `(${currency})` : ""}</span>
                <input
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-line bg-bg px-3 num"
                  autoFocus
                />
              </label>
              {price != null && <p className="ticker">Cours actuel : {fmtPrice(price, currency)}</p>}
              <button type="submit" disabled={!valid} className="w-full h-9 rounded-md bg-ink text-bg disabled:opacity-40">
                Créer l’alerte
              </button>
              <p className="ticker leading-relaxed">Vérifiée toutes les 2 minutes tant qu’un onglet Boussole est ouvert.</p>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
