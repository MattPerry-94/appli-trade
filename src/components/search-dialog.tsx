"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Hit {
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
  CRYPTOCURRENCY: "Crypto",
  FUTURE: "Contrat à terme",
  MUTUALFUND: "Fonds",
  COIN: "Crypto",
};

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setTimeout(() => input.current?.focus(), 0);
    } else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 1) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const json = (await res.json()) as { hits: Hit[] };
        setHits(json.hits);
        setSel(0);
      } catch {
        /* requête annulée */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (h: Hit) => {
    setOpen(false);
    setQ("");
    router.push(h.href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 inline-flex items-center gap-2 rounded-md border border-line bg-bg pl-3 pr-2 text-sm text-ink-3 hover:border-line-strong transition-colors sm:w-64"
        aria-label="Rechercher un actif"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-4.2-4.2" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">Action, indice, crypto…</span>
        <kbd className="ml-auto hidden sm:inline ticker border border-line rounded px-1.5 py-0.5">Ctrl K</kbd>
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialog.current) setOpen(false);
        }}
        className="m-0 mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-xl rounded-lg border border-line-strong bg-surface p-0 text-ink shadow-xl backdrop:bg-black/30"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-3" aria-hidden>
            <circle cx="11" cy="11" r="6.5" />
            <path d="m20 20-4.2-4.2" strokeLinecap="round" />
          </svg>
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((s) => Math.min(s + 1, hits.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((s) => Math.max(s - 1, 0));
              } else if (e.key === "Enter" && hits[sel]) {
                go(hits[sel]);
              }
            }}
            placeholder="Rechercher : LVMH, Apple, Toyota, bitcoin, CAC 40…"
            className="h-12 flex-1 bg-transparent outline-none placeholder:text-ink-3"
            aria-label="Rechercher"
          />
          {loading && <span className="ticker">…</span>}
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-1" role="listbox">
          {(q.trim() ? hits : []).map((h, i) => (
            <li key={h.href} role="option" aria-selected={i === sel}>
              <button
                type="button"
                onMouseEnter={() => setSel(i)}
                onClick={() => go(h)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${i === sel ? "bg-surface-2" : ""}`}
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
          {q.trim() && !loading && hits.length === 0 && <li className="px-4 py-6 text-sm text-ink-3">Aucun résultat.</li>}
          {!q.trim() && (
            <li className="px-4 py-4 text-sm text-ink-3">
              Tapez un nom ou un symbole. Astuce : <kbd className="ticker">/</kbd> ouvre aussi la recherche.
            </li>
          )}
        </ul>
      </dialog>
    </>
  );
}
