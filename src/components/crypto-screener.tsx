"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Change, ScoreBar, Sparkline } from "./ui";
import { WatchButton } from "./watch-button";
import { fmtCompact, fmtPrice } from "@/lib/format";

export interface CoinRow {
  id: string;
  symbol: string;
  name: string;
  image: string;
  rank: number;
  price: number;
  marketCap: number;
  volume: number;
  ch1h: number | null;
  ch24h: number | null;
  ch7d: number | null;
  ch30d: number | null;
  ch1y: number | null;
  athChangePct: number | null;
  spark: number[];
  score: number | null;
  main: boolean;
}

type SortKey = "rank" | "price" | "ch1h" | "ch24h" | "ch7d" | "ch30d" | "ch1y" | "marketCap" | "volume" | "athChangePct" | "score";

const COLS: { key: SortKey; label: string; className?: string }[] = [
  { key: "price", label: "Prix" },
  { key: "ch1h", label: "1 h", className: "hidden 2xl:table-cell" },
  { key: "ch24h", label: "24 h" },
  { key: "ch7d", label: "7 j", className: "hidden sm:table-cell" },
  { key: "ch30d", label: "30 j", className: "hidden md:table-cell" },
  { key: "ch1y", label: "1 an", className: "hidden xl:table-cell" },
  { key: "athChangePct", label: "Vs record", className: "hidden 2xl:table-cell" },
  { key: "marketCap", label: "Capitalisation", className: "hidden lg:table-cell" },
  { key: "score", label: "Tendance" },
];

export function CryptoScreener({ rows }: { rows: CoinRow[] }) {
  const [mainOnly, setMainOnly] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "rank", dir: 1 });

  const list = useMemo(() => {
    const nq = q.trim().toLowerCase();
    const out = rows.filter((r) => (!mainOnly || r.main) && (!nq || r.name.toLowerCase().includes(nq) || r.symbol.toLowerCase().includes(nq)));
    out.sort((a, b) => {
      const va = a[sort.key];
      const vb = b[sort.key];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return ((va as number) - (vb as number)) * sort.dir;
    });
    return out;
  }, [rows, mainOnly, q, sort]);

  const clickSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "rank" ? 1 : -1 }));
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === -1 ? " ↓" : " ↑") : "");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-line">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrer : bitcoin, SOL…"
          className="h-9 rounded-md border border-line bg-surface px-3 text-sm w-full sm:w-56"
          aria-label="Filtrer les cryptomonnaies"
        />
        <label className="inline-flex items-center gap-2 text-sm text-ink-2 cursor-pointer">
          <input type="checkbox" checked={mainOnly} onChange={(e) => setMainOnly(e.target.checked)} className="accent-[var(--accent)]" />
          Masquer stablecoins et jetons dérivés
        </label>
        <span className="text-sm text-ink-3 sm:ml-auto">{list.length} cryptomonnaies</span>
      </div>
      <div className="scroll-x">
        <table className="data-table text-sm">
          <thead>
            <tr>
              <th>
                <button onClick={() => clickSort("rank")} className="uppercase hover:text-ink">
                  # Nom{arrow("rank")}
                </button>
              </th>
              {COLS.map((c) => (
                <th key={c.key} className={c.className}>
                  <button onClick={() => clickSort(c.key)} className="uppercase hover:text-ink">
                    {c.label}
                    {arrow(c.key)}
                  </button>
                </th>
              ))}
              <th className="hidden lg:table-cell">7 jours</th>
              <th aria-label="Favori" />
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/crypto/${r.id}`} className="flex items-center gap-2.5 hover:text-accent">
                    <span className="num ticker w-6 text-right">{r.rank}</span>
                    <Image src={r.image} alt="" width={20} height={20} className="rounded-full" unoptimized />
                    <span className="font-medium truncate max-w-[10rem]">{r.name}</span>
                    <span className="ticker">{r.symbol}</span>
                  </Link>
                </td>
                <td>{fmtPrice(r.price, "EUR")}</td>
                <td className="hidden 2xl:table-cell">
                  <Change value={r.ch1h} />
                </td>
                <td>
                  <Change value={r.ch24h} />
                </td>
                <td className="hidden sm:table-cell">
                  <Change value={r.ch7d} />
                </td>
                <td className="hidden md:table-cell">
                  <Change value={r.ch30d} />
                </td>
                <td className="hidden xl:table-cell">
                  <Change value={r.ch1y} digits={1} />
                </td>
                <td className="hidden 2xl:table-cell">
                  <Change value={r.athChangePct} digits={0} />
                </td>
                <td className="hidden lg:table-cell text-ink-2">{fmtCompact(r.marketCap, "EUR")}</td>
                <td>
                  <ScoreBar score={r.score} size="sm" />
                </td>
                <td className="hidden lg:table-cell">
                  <Sparkline values={r.spark} width={88} height={24} className="ml-auto" />
                </td>
                <td className="w-8">
                  <WatchButton compact item={{ kind: "coin", id: r.id, name: r.name }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ticker mt-4">
        « Tendance » : score rapide (dynamique 7 j, 30 j et 1 an).
        L’analyse complète est sur chaque fiche.
      </p>
    </div>
  );
}
