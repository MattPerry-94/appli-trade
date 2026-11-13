"use client";

import { useWatchlist, type WatchItem } from "@/lib/watchlist";

export function WatchButton({ item, compact = false }: { item: WatchItem; compact?: boolean }) {
  const { has, toggle } = useWatchlist();
  const on = has(item.kind, item.id);
  const label = on ? "Retirer des favoris" : "Ajouter aux favoris";
  if (compact) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle(item);
        }}
        aria-pressed={on}
        aria-label={label}
        title={label}
        className={`p-1 -m-1 leading-none transition-colors ${on ? "text-accent" : "text-ink-3 hover:text-ink"}`}
      >
        <Star filled={on} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => toggle(item)}
      aria-pressed={on}
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
        on ? "border-accent text-accent bg-accent-soft" : "border-line-strong text-ink-2 hover:text-ink hover:border-ink-3"
      }`}
    >
      <Star filled={on} />
      {on ? "Dans mes favoris" : "Suivre"}
    </button>
  );
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
