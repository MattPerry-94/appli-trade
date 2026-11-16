"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { squarify } from "@/lib/treemap";
import { fmtCompact, fmtPct } from "@/lib/format";
import { REGION_LABEL, type Region } from "@/lib/universe";

export interface MapRow {
  symbol: string;
  name: string;
  sector: string;
  region: Region;
  cap: number;
  day: number | null;
  year: number | null;
}

type Period = "day" | "year";

/** Seuils (en %) des 3 paliers de couleur de part et d'autre du neutre. */
const STEPS: Record<Period, [number, number, number]> = {
  day: [0.25, 1, 2.5],
  year: [2.5, 10, 25],
};

function heat(v: number | null, period: Period): { bg: string; strong: boolean } {
  if (v == null) return { bg: "var(--heat-0)", strong: false };
  const [a, b, c] = STEPS[period];
  const m = Math.abs(v);
  if (m < a) return { bg: "var(--heat-0)", strong: false };
  const side = v > 0 ? "up" : "down";
  const lvl = m >= c ? 3 : m >= b ? 2 : 1;
  return { bg: `var(--heat-${side}-${lvl})`, strong: lvl === 3 };
}

const HEADER = 20;
const GAP = 2;

export function SectorMap({ rows }: { rows: MapRow[] }) {
  const [region, setRegion] = useState<Region | "all">("all");
  const [period, setPeriod] = useState<Period>("day");
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<{ row: MapRow; x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const list = useMemo(() => rows.filter((r) => region === "all" || r.region === region), [rows, region]);

  const layout = useMemo(() => {
    if (!size.w || !size.h) return [];
    const bySector = new Map<string, MapRow[]>();
    for (const r of list) bySector.set(r.sector, [...(bySector.get(r.sector) ?? []), r]);
    const sectors = Array.from(bySector.entries()).map(([sector, items]) => ({
      sector,
      items,
      value: items.reduce((s, i) => s + i.cap, 0),
    }));
    return squarify(sectors, { x: 0, y: 0, w: size.w, h: size.h }).map((s) => {
      const showHeader = s.h > 50 && s.w > 70;
      const inner = { x: s.x + GAP, y: s.y + (showHeader ? HEADER : GAP), w: s.w - GAP * 2, h: s.h - (showHeader ? HEADER : GAP) - GAP };
      const tiles = squarify(
        s.items.map((i) => ({ ...i, value: i.cap })),
        inner,
      );
      // Variation pondérée du secteur
      const withV = s.items.filter((i) => i[period] != null);
      const wsum = withV.reduce((a, i) => a + i.cap, 0);
      const avg = wsum ? withV.reduce((a, i) => a + (i[period] as number) * i.cap, 0) / wsum : null;
      return { ...s, showHeader, tiles, avg };
    });
  }, [list, size, period]);

  return (
    <div>
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
        <div className="flex rounded-md border border-line p-0.5 text-sm" role="tablist" aria-label="Période">
          {(
            [
              ["day", "Jour"],
              ["year", "1 an"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={period === k}
              onClick={() => setPeriod(k)}
              className={`px-3 py-1 rounded ${period === k ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <Legend period={period} />
      </div>

      <div
        ref={box}
        className="relative mt-4 h-[560px] sm:h-[640px] select-none"
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Carte des capitalisations par secteur, colorée selon la variation"
      >
        {layout.map((s) => (
          <div key={s.sector}>
            <div className="absolute rounded-[4px] bg-surface-2" style={{ left: s.x + 1, top: s.y + 1, width: s.w - 2, height: s.h - 2 }} />
            {s.showHeader && (
              <div
                className="absolute flex items-center justify-between gap-2 px-1.5 text-[0.7rem] font-mono uppercase tracking-wide text-ink-2 overflow-hidden whitespace-nowrap"
                style={{ left: s.x + 1, top: s.y + 1, width: s.w - 2, height: HEADER }}
              >
                <span className="truncate">{s.sector}</span>
                {s.avg != null && s.w > 150 && <span className="num normal-case">{fmtPct(s.avg, 1)}</span>}
              </div>
            )}
            {s.tiles.map((t) => {
              const v = t[period];
              const c = heat(v, period);
              const big = t.w > 64 && t.h > 34;
              const mid = t.w > 40 && t.h > 22;
              return (
                <Link
                  key={t.symbol}
                  href={`/actif/${encodeURIComponent(t.symbol)}`}
                  onPointerMove={(e) => {
                    const r = box.current!.getBoundingClientRect();
                    setHover({ row: t, x: e.clientX - r.left, y: e.clientY - r.top });
                  }}
                  className="absolute rounded-[3px] overflow-hidden flex flex-col items-center justify-center text-center leading-tight outline-offset-1 hover:outline hover:outline-2 hover:outline-ink"
                  style={{
                    left: t.x + 1,
                    top: t.y + 1,
                    width: Math.max(t.w - 2, 0),
                    height: Math.max(t.h - 2, 0),
                    background: c.bg,
                    color: c.strong ? "var(--heat-ink-strong)" : "var(--ink)",
                  }}
                  aria-label={`${t.name} : ${fmtPct(v, 2)}`}
                >
                  {mid && (
                    <span className={`px-1 truncate max-w-full font-medium ${big && t.w > 110 ? "text-sm" : "text-[0.7rem]"}`}>
                      {big ? t.name : t.name.split(/[ (]/)[0]}
                    </span>
                  )}
                  {big && <span className="num text-xs">{fmtPct(v, period === "day" ? 2 : 1)}</span>}
                </Link>
              );
            })}
          </div>
        ))}
        {hover && (
          <div
            className="pointer-events-none absolute z-10 rounded-md border border-line-strong bg-surface px-3 py-2 text-xs shadow-sm"
            style={{
              left: hover.x,
              top: hover.y,
              transform: `translate(${hover.x > size.w * 0.65 ? "calc(-100% - 12px)" : "12px"}, ${hover.y > size.h * 0.7 ? "calc(-100% - 12px)" : "12px"})`,
            }}
          >
            <div className="font-medium text-sm">{hover.row.name}</div>
            <div className="ticker mb-1">
              {hover.row.symbol} · {hover.row.sector} · {REGION_LABEL[hover.row.region]}
            </div>
            <div className="num">
              Jour : {fmtPct(hover.row.day)} · 1 an : {fmtPct(hover.row.year, 1)}
            </div>
            <div className="num text-ink-3">Capitalisation : {fmtCompact(hover.row.cap, "EUR")}</div>
          </div>
        )}
      </div>
      <p className="ticker mt-3 leading-relaxed">
        Taille : capitalisation boursière convertie en euros. Pourcentage du secteur : moyenne pondérée par la capitalisation.
        Cliquez sur une entreprise pour ouvrir sa fiche.
      </p>
    </div>
  );
}

function Legend({ period }: { period: Period }) {
  const [a, b, c] = STEPS[period];
  const fmt = (v: number) => `${v.toLocaleString("fr-FR")} %`;
  const items = [
    { k: "down-3", label: `≤ −${fmt(c)}` },
    { k: "down-2", label: "" },
    { k: "down-1", label: "" },
    { k: "0", label: `±${fmt(a)}` },
    { k: "up-1", label: "" },
    { k: "up-2", label: "" },
    { k: "up-3", label: `≥ +${fmt(c)}` },
  ];
  return (
    <div className="sm:ml-auto flex items-center gap-2 text-xs text-ink-3" aria-label={`Échelle : de −${fmt(c)} à +${fmt(c)}, paliers à ${fmt(a)}, ${fmt(b)} et ${fmt(c)}`}>
      <span>Baisse</span>
      <span className="flex gap-[2px]">
        {items.map((i) => (
          <span key={i.k} className="h-3 w-5 first:rounded-l-[3px] last:rounded-r-[3px]" style={{ background: `var(--heat-${i.k})` }} title={i.label} />
        ))}
      </span>
      <span>Hausse</span>
      <span className="ticker hidden md:inline">(paliers {fmt(a)} · {fmt(b)} · {fmt(c)})</span>
    </div>
  );
}
