"use client";

import { useMemo, useRef, useState } from "react";
import { fmtNumber } from "@/lib/format";

const W = 320;
const H = 110;
const M = { l: 4, r: 36, t: 8, b: 16 };

export interface EconChartPoint {
  t: number;
  v: number;
  period: string;
}

function periodLabel(p: string): string {
  if (/^\d{4}-Q[1-4]$/.test(p)) return `${p.slice(6)}e trimestre ${p.slice(0, 4)}`.replace(/^1e/, "1er");
  const d = new Date(p.length === 7 ? `${p}-01` : p);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric", ...(p.length > 7 ? { day: "numeric" } : {}), timeZone: "UTC" });
}

/** Courbe compacte d'un indicateur économique, avec repère de cible et info-bulle. */
export function EconChart({ points, target, step = false, label }: { points: EconChartPoint[]; target?: number; step?: boolean; label: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [hi, setHi] = useState<number | null>(null);

  const g = useMemo(() => {
    const pts = points;
    const t0 = pts[0]?.t ?? 0;
    const t1 = pts[pts.length - 1]?.t ?? 1;
    const vals = pts.map((p) => p.v).concat(target != null ? [target] : []);
    let lo = Math.min(...vals, 0);
    let hiV = Math.max(...vals);
    const pad = (hiV - lo) * 0.1 || 0.5;
    lo = Math.min(lo, Math.min(...vals) - pad);
    hiV += pad;
    const x = (t: number) => M.l + ((t - t0) / (t1 - t0 || 1)) * (W - M.l - M.r);
    const y = (v: number) => M.t + (1 - (v - lo) / (hiV - lo || 1)) * (H - M.t - M.b);
    let d = "";
    pts.forEach((p, i) => {
      if (i === 0) d += `M${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`;
      else if (step) d += `H${x(p.t).toFixed(1)}V${y(p.v).toFixed(1)}`;
      else d += `L${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`;
    });
    const years: { t: number; label: string }[] = [];
    const y0 = new Date(t0).getUTCFullYear() + 1;
    const y1 = new Date(t1).getUTCFullYear();
    for (let yr = y0; yr <= y1; yr++) years.push({ t: Date.UTC(yr, 0, 1), label: String(yr).slice(2) });
    return { x, y, d, lo, hiV, years, zeroY: lo < 0 ? y(0) : null };
  }, [points, target, step]);

  if (points.length < 2) return null;
  const hp = hi != null ? points[hi] : null;
  const lastP = points[points.length - 1];

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto touch-none select-none"
        role="img"
        aria-label={`${label} : historique`}
        onPointerMove={(e) => {
          const r = ref.current!.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          let best = 0;
          let bd = Infinity;
          points.forEach((p, i) => {
            const dd = Math.abs(g.x(p.t) - px);
            if (dd < bd) {
              bd = dd;
              best = i;
            }
          });
          setHi(best);
        }}
        onPointerLeave={() => setHi(null)}
      >
        {g.zeroY != null && <line x1={M.l} x2={W - M.r} y1={g.zeroY} y2={g.zeroY} stroke="var(--line-strong)" />}
        {target != null && (
          <>
            <line x1={M.l} x2={W - M.r} y1={g.y(target)} y2={g.y(target)} stroke="var(--ink-3)" strokeDasharray="3 3" />
            <text x={W - M.r + 4} y={g.y(target) + 3.5} fontSize="10" fill="var(--ink-3)" fontFamily="var(--font-plex-mono)">
              {fmtNumber(target, 0)} %
            </text>
          </>
        )}
        {g.years.map((yr) => (
          <text key={yr.t} x={g.x(yr.t)} y={H - 3} fontSize="9.5" fill="var(--ink-3)" textAnchor="middle" fontFamily="var(--font-plex-mono)">
            {yr.label}
          </text>
        ))}
        <path d={g.d} fill="none" stroke="var(--chart-line)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {!hp && <circle cx={g.x(lastP.t)} cy={g.y(lastP.v)} r="3.5" fill="var(--chart-line)" stroke="var(--surface)" strokeWidth="2" />}
        {hp && (
          <>
            <line x1={g.x(hp.t)} x2={g.x(hp.t)} y1={M.t} y2={H - M.b} stroke="var(--ink-3)" />
            <circle cx={g.x(hp.t)} cy={g.y(hp.v)} r="4" fill="var(--chart-line)" stroke="var(--surface)" strokeWidth="2" />
          </>
        )}
      </svg>
      {hp && (
        <div
          className="pointer-events-none absolute top-0 rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-xs shadow-sm whitespace-nowrap"
          style={{ left: `${(g.x(hp.t) / W) * 100}%`, transform: g.x(hp.t) > W * 0.55 ? "translateX(calc(-100% - 8px))" : "translateX(8px)" }}
        >
          <span className="text-ink-3">{periodLabel(hp.period)}</span> · <b className="num">{fmtNumber(hp.v, 2)} %</b>
        </div>
      )}
    </div>
  );
}
