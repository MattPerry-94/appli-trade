"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface PickedHit {
  href: string;
  name: string;
  symbol: string;
  type: string;
  exchange: string;
}

const TYPE_FR: Record<string, string> = {
  EQUITY: "Action",
  INDEX: "Indice",
  ETF: "ETF",
  CURRENCY: "Devise",
  FUTURE: "Mat. première",
  MUTUALFUND: "Fonds",
  COIN: "Crypto",
};

/** Identifiant CoinGecko d'un résultat crypto (lien /crypto/{id}). */
export function coinIdOf(hit: PickedHit): string | null {
  return hit.type === "COIN" ? decodeURIComponent(hit.href.replace(/^\/crypto\//, "")) : null;
}

/** Champ de recherche compact avec liste de suggestions (utilise /api/search). */
export function SymbolPicker({
  onPick,
  placeholder = "Ajouter : nom ou symbole…",
  disabled = false,
  className = "",
}: {
  onPick: (h: PickedHit) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PickedHit[]>([]);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const listId = useId();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const json = (await res.json()) as { hits: PickedHit[] };
        setHits(json.hits);
        setSel(0);
        setOpen(true);
      } catch {
        /* requête annulée */
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const shown = q.trim() && open ? hits : [];
  const pick = (h: PickedHit) => {
    onPick(h);
    setQ("");
    setHits([]);
    setOpen(false);
  };

  return (
    <div ref={wrap} className={`relative ${className}`}>
      <input
        value={q}
        disabled={disabled}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSel((s) => Math.min(s + 1, shown.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSel((s) => Math.max(s - 1, 0));
          } else if (e.key === "Enter" && shown[sel]) {
            e.preventDefault();
            pick(shown[sel]);
          } else if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-line bg-surface px-3 text-sm disabled:opacity-50"
        role="combobox"
        aria-expanded={shown.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
      />
      {shown.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 w-full min-w-72 max-h-72 overflow-y-auto rounded-md border border-line-strong bg-surface py-1 shadow-lg">
          {shown.map((h, i) => (
            <li key={h.href} role="option" aria-selected={i === sel}>
              <button
                type="button"
                onMouseEnter={() => setSel(i)}
                onClick={() => pick(h)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm ${i === sel ? "bg-surface-2" : ""}`}
              >
                <span className="flex-1 min-w-0">
                  <span className="block truncate">{h.name}</span>
                  <span className="ticker">
                    {h.symbol} · {h.exchange}
                  </span>
                </span>
                <span className="ticker shrink-0">{TYPE_FR[h.type] ?? h.type}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
