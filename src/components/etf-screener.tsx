"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Change, ScoreBar, Sparkline } from "./ui";
import { WatchButton } from "./watch-button";
import { fmtNumber, fmtPct, fmtPrice, trendClass } from "@/lib/format";
import type { EtfDef } from "@/lib/universe";

export interface EtfRow extends Omit<EtfDef, "ter"> {
  ter: number | null;
  price: number | null;
  currency: string | null;
  changePct: number | null;
  yearChangePct: number | null;
  annualized5y: number | null;
  vol: number | null;
  score: number | null;
  spark: number[];
}

type SortKey = "name" | "changePct" | "yearChangePct" | "annualized5y" | "ter" | "vol" | "score";

const COLS: { key: SortKey; label: string; className?: string; asc?: boolean }[] = [
  { key: "changePct", label: "Jour" },
  { key: "yearChangePct", label: "1 an", className: "hidden sm:table-cell" },
  { key: "annualized5y", label: "5 ans / an", className: "hidden md:table-cell" },
  { key: "ter", label: "Frais", className: "hidden md:table-cell", asc: true },
  { key: "vol", label: "Risque", className: "hidden lg:table-cell", asc: true },
  { key: "score", label: "Tendance" },
];

const ACCOUNTS = [
  ["all", "Tous"],
  ["pea", "Éligibles PEA"],
  ["cto", "Compte-titres"],
] as const;

export function EtfScreener({ rows, categories, initialPea }: { rows: EtfRow[]; categories: string[]; initialPea?: boolean }) {
  const [account, setAccount] = useState<"all" | "pea" | "cto">(initialPea ? "pea" : "all");
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });

  const list = useMemo(() => {
    const out = rows.filter((r) => (account === "all" || (account === "pea" ? r.pea : !r.pea)) && (cat === "all" || r.category === cat));
    if (sort.key === "name") {
      // Ordre par défaut : catégorie, puis frais croissants
      out.sort((a, b) => categories.indexOf(a.category) - categories.indexOf(b.category) || (a.ter ?? 9) - (b.ter ?? 9));
      return out;
    }
    out.sort((a, b) => {
      const va = a[sort.key] as number | null;
      const vb = b[sort.key] as number | null;
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va - vb) * sort.dir;
    });
    return out;
  }, [rows, account, cat, sort, categories]);

  const clickSort = (key: SortKey, asc?: boolean) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "name" || asc ? 1 : -1 }));
  const arrow = (key: SortKey) => (sort.key === key && key !== "name" ? (sort.dir === -1 ? " ↓" : " ↑") : "");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-line">
        <div className="flex rounded-md border border-line p-0.5 text-sm" role="tablist" aria-label="Enveloppe">
          {ACCOUNTS.map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={account === k}
              onClick={() => setAccount(k)}
              className={`px-3 py-1 rounded whitespace-nowrap ${account === k ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 rounded-md border border-line bg-surface px-2 text-sm" aria-label="Catégorie">
          <option value="all">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p className="text-sm text-ink-3 sm:ml-auto">{list.length} fonds</p>
      </div>
      <div className="scroll-x">
        <table className="data-table text-sm">
          <thead>
            <tr>
              <th>
                <button onClick={() => clickSort("name")} className="uppercase hover:text-ink">
                  Fonds
                </button>
              </th>
              <th className="hidden sm:table-cell">Cours</th>
              <th className="hidden xl:table-cell">Courbe 1 an</th>
              {COLS.map((c) => (
                <th key={c.key} className={c.className} aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
                  <button onClick={() => clickSort(c.key, c.asc)} className="uppercase hover:text-ink">
                    {c.label}
                    {arrow(c.key)}
                  </button>
                </th>
              ))}
              <th aria-label="Favori" />
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.symbol}>
                <td className="max-w-[19rem]">
                  <Link href={`/actif/${encodeURIComponent(r.symbol)}`} className="block hover:text-accent">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{r.name}</span>
                      {r.pea && <Badge tone="accent">PEA</Badge>}
                    </span>
                    <span className="ticker block truncate">
                      {r.symbol} · {r.category} · {r.tracks}
                    </span>
                  </Link>
                </td>
                <td className="hidden sm:table-cell">{fmtPrice(r.price, r.currency)}</td>
                <td className="hidden xl:table-cell">
                  <Sparkline values={r.spark} width={72} height={22} className="ml-auto" />
                </td>
                <td>
                  <Change value={r.changePct} />
                </td>
                <td className="hidden sm:table-cell">
                  <Change value={r.yearChangePct} digits={1} />
                </td>
                <td className={`hidden md:table-cell num ${trendClass(r.annualized5y)}`}>{fmtPct(r.annualized5y, 1)}</td>
                <td className="hidden md:table-cell text-ink-2">{r.ter != null ? `${fmtNumber(r.ter, 2)} %` : "—"}</td>
                <td className="hidden lg:table-cell text-ink-2">{r.vol != null ? `${fmtNumber(r.vol, 0)} %` : "—"}</td>
                <td>
                  <ScoreBar score={r.score} size="sm" />
                </td>
                <td className="w-8">
                  <WatchButton compact item={{ kind: "asset", id: r.symbol, name: r.name }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <p className="py-10 text-center text-sm text-ink-3">Aucun fonds ne correspond à ces filtres.</p>}
      </div>
    </div>
  );
}
