"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Change, ScoreBar, Sparkline } from "./ui";
import { WatchButton } from "./watch-button";
import { fmtCompact, fmtNumber, fmtPrice } from "@/lib/format";
import { REGION_LABEL, type Region } from "@/lib/universe";

export interface StockRow {
  symbol: string;
  name: string;
  region: Region;
  country: string;
  sector: string;
  price: number | null;
  currency: string | null;
  changePct: number | null;
  yearChangePct: number | null;
  capEur: number | null;
  pe: number | null;
  dividendYield: number | null;
  score: number | null;
  spark: number[];
  marketState: string | null;
}

type SortKey = "name" | "changePct" | "yearChangePct" | "capEur" | "pe" | "dividendYield" | "score";

const COLS: { key: SortKey; label: string; className?: string }[] = [
  { key: "changePct", label: "Jour" },
  { key: "yearChangePct", label: "1 an", className: "hidden md:table-cell" },
  { key: "capEur", label: "Capitalisation", className: "hidden lg:table-cell" },
  { key: "pe", label: "PER", className: "hidden lg:table-cell" },
  { key: "dividendYield", label: "Rdt", className: "hidden xl:table-cell" },
  { key: "score", label: "Tendance" },
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function StockScreener({
  rows,
  sectors,
  initialSort,
  initialRegion,
}: {
  rows: StockRow[];
  sectors: string[];
  initialSort?: string;
  initialRegion?: string;
}) {
  const [region, setRegion] = useState<Region | "all">(
    initialRegion && initialRegion in REGION_LABEL ? (initialRegion as Region) : "all",
  );
  const [sector, setSector] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>(
    initialSort === "score" ? { key: "score", dir: -1 } : { key: "capEur", dir: -1 },
  );

  const list = useMemo(() => {
    const nq = norm(q.trim());
    const out = rows.filter(
      (r) =>
        (region === "all" || r.region === region) &&
        (sector === "all" || r.sector === sector) &&
        (!nq || norm(r.name).includes(nq) || norm(r.symbol).includes(nq)),
    );
    out.sort((a, b) => {
      if (sort.key === "name") return a.name.localeCompare(b.name, "fr") * sort.dir;
      const va = a[sort.key];
      const vb = b[sort.key];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return ((va as number) - (vb as number)) * sort.dir;
    });
    return out;
  }, [rows, region, sector, q, sort]);

  const clickSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "name" ? 1 : -1 }));

  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === -1 ? " ↓" : " ↑") : "");

  const counts = useMemo(() => {
    const scored = list.filter((r) => r.score != null);
    return {
      up: scored.filter((r) => (r.score as number) >= 55).length,
      down: scored.filter((r) => (r.score as number) <= 45).length,
      total: scored.length,
    };
  }, [list]);

  return (
    <div>
      {/* Filtres : une seule ligne au-dessus du tableau */}
      <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-line">
        <div className="flex rounded-md border border-line p-0.5 text-sm" role="tablist" aria-label="Région">
          {(["all", "europe", "usa", "asie"] as const).map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={region === r}
              onClick={() => setRegion(r)}
              className={`px-3 py-1 rounded whitespace-nowrap ${region === r ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"}`}
            >
              {r === "all" ? "Toutes" : REGION_LABEL[r]}
            </button>
          ))}
        </div>
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="h-9 rounded-md border border-line bg-surface px-2 text-sm"
          aria-label="Secteur"
        >
          <option value="all">Tous les secteurs</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrer par nom…"
          className="h-9 rounded-md border border-line bg-surface px-3 text-sm w-full sm:w-56"
          aria-label="Filtrer par nom"
        />
        <p className="text-sm text-ink-3 sm:ml-auto">
          {list.length} valeurs · <span className="text-up">{counts.up} haussières</span> ·{" "}
          <span className="text-down">{counts.down} baissières</span>
        </p>
      </div>

      <div className="scroll-x">
        <table className="data-table text-sm">
          <thead>
            <tr>
              <th>
                <button onClick={() => clickSort("name")} className="uppercase hover:text-ink">
                  Valeur{arrow("name")}
                </button>
              </th>
              <th className="hidden sm:table-cell">Cours</th>
              <th className="hidden md:table-cell">1 mois</th>
              {COLS.map((c) => (
                <th key={c.key} className={c.className} aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
                  <button onClick={() => clickSort(c.key)} className="uppercase hover:text-ink">
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
                <td className="max-w-[16rem]">
                  <Link href={`/actif/${encodeURIComponent(r.symbol)}`} className="block hover:text-accent">
                    <span className="block truncate font-medium">{r.name}</span>
                    <span className="ticker">
                      {r.symbol} · {r.country} · {r.sector}
                    </span>
                  </Link>
                </td>
                <td className="hidden sm:table-cell">{fmtPrice(r.price, r.currency)}</td>
                <td className="hidden md:table-cell">
                  <Sparkline values={r.spark} width={72} height={22} className="ml-auto" />
                </td>
                <td>
                  <Change value={r.changePct} />
                </td>
                <td className="hidden md:table-cell">
                  <Change value={r.yearChangePct} digits={1} />
                </td>
                <td className="hidden lg:table-cell text-ink-2">{fmtCompact(r.capEur, "EUR")}</td>
                <td className="hidden lg:table-cell text-ink-2">{r.pe != null && r.pe > 0 ? fmtNumber(r.pe, 1) : "—"}</td>
                <td className="hidden xl:table-cell text-ink-2">{r.dividendYield != null ? `${fmtNumber(r.dividendYield, 1)} %` : "—"}</td>
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
        {!list.length && <p className="py-10 text-center text-sm text-ink-3">Aucune valeur ne correspond à ces filtres.</p>}
      </div>
      <p className="ticker mt-4 leading-relaxed">
        Capitalisations converties en euros. « Tendance » : score rapide 0–100 (position vs moyennes 50 et 200 jours,
        dynamique sur 1 an, avis moyen des analystes). L’analyse complète est sur chaque fiche.
      </p>
    </div>
  );
}
