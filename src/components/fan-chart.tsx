"use client";

import { useMemo, useRef, useState } from "react";
import type { FanPoint } from "@/lib/analysis";
import { fmtNumber, fmtPct } from "@/lib/format";

const W = 720;
const H = 280;
const M = { l: 8, r: 64, t: 12, b: 26 };

/** Graphique en éventail : 6 mois d'historique + zone de probabilité sur 6 mois. */
export function FanChart({ points, currency, digits }: { points: FanPoint[]; currency?: string | null; digits?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const [hi, setHi] = useState<number | null>(null);

  const g = useMemo(() => {
    const t0 = points[0]?.t ?? 0;
    const t1 = points[points.length - 1]?.t ?? 1;
    const vals = points.flatMap((p) => [p.close, p.p5, p.p95].filter((v): v is number => v != null));
    let lo = Math.min(...vals);
    let hiV = Math.max(...vals);
    const pad = (hiV - lo) * 0.06;
    lo -= pad;
    hiV += pad;
    const x = (t: number) => M.l + ((t - t0) / (t1 - t0 || 1)) * (W - M.l - M.r);
    const y = (v: number) => M.t + (1 - (v - lo) / (hiV - lo || 1)) * (H - M.t - M.b);
    const past = points.filter((p) => p.close != null);
    const fut = points.filter((p) => p.p50 != null);
    const area = (a: keyof FanPoint, b: keyof FanPoint) =>
      fut.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p[a] as number).toFixed(1)}`).join("") +
      [...fut].reverse().map((p) => `L${x(p.t).toFixed(1)},${y(p[b] as number).toFixed(1)}`).join("") +
      "Z";
    const line = (arr: FanPoint[], k: keyof FanPoint) => arr.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p[k] as number).toFixed(1)}`).join("");
    // Graduations
    const ticks: number[] = [];
    const step = niceStep((hiV - lo) / 4);
    for (let v = Math.ceil(lo / step) * step; v <= hiV; v += step) ticks.push(v);
    const months: { t: number; label: string }[] = [];
    const d = new Date(t0 * 1000);
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
    while (d.getTime() / 1000 <= t1) {
      d.setUTCMonth(d.getUTCMonth() + 1);
      const t = d.getTime() / 1000;
      if (t > t0 && t < t1) months.push({ t, label: d.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" }) });
    }
    return { x, y, past, fut, area, line, ticks, months, nowT: past[past.length - 1]?.t ?? t0 };
  }, [points]);

  if (points.length < 10) return null;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = ref.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    let bd = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(g.x(p.t) - px);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    setHi(best);
  };

  const hp = hi != null ? points[hi] : null;
  const start = g.past[g.past.length - 1]?.close ?? 0;

  return (
    <figure>
      <div className="relative">
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto touch-none select-none"
          onPointerMove={onMove}
          onPointerLeave={() => setHi(null)}
          role="img"
          aria-label="Historique sur 6 mois et fourchettes de prix statistiques sur les 6 prochains mois"
        >
          {g.ticks.map((v) => (
            <g key={v}>
              <line x1={M.l} x2={W - M.r} y1={g.y(v)} y2={g.y(v)} stroke="var(--line)" />
              <text x={W - M.r + 8} y={g.y(v) + 4} fontSize="11" fill="var(--ink-3)" className="num" fontFamily="var(--font-plex-mono)">
                {fmtNumber(v, v >= 1000 ? 0 : digits)}
              </text>
            </g>
          ))}
          {g.months.map((m) => (
            <text key={m.t} x={g.x(m.t)} y={H - 6} fontSize="11" fill="var(--ink-3)" textAnchor="middle" fontFamily="var(--font-plex-mono)">
              {m.label}
            </text>
          ))}
          <line x1={g.x(g.nowT)} x2={g.x(g.nowT)} y1={M.t} y2={H - M.b} stroke="var(--line-strong)" strokeDasharray="3 3" />
          <text x={g.x(g.nowT) + 6} y={M.t + 10} fontSize="11" fill="var(--ink-3)" fontFamily="var(--font-plex-mono)">
            aujourd’hui
          </text>
          <path d={g.area("p95", "p5")} fill="var(--chart-band)" />
          <path d={g.area("p75", "p25")} fill="var(--chart-band-2)" />
          <path d={g.line(g.fut, "p50")} fill="none" stroke="var(--chart-line)" strokeWidth="1.5" strokeDasharray="5 4" />
          <path d={g.line(g.past, "close")} fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
          {hp && (
            <g>
              <line x1={g.x(hp.t)} x2={g.x(hp.t)} y1={M.t} y2={H - M.b} stroke="var(--ink-3)" strokeWidth="1" />
              {hp.close != null && <circle cx={g.x(hp.t)} cy={g.y(hp.close)} r="4" fill="var(--ink)" stroke="var(--surface)" strokeWidth="2" />}
              {hp.close == null && hp.p50 != null && <circle cx={g.x(hp.t)} cy={g.y(hp.p50)} r="4" fill="var(--chart-line)" stroke="var(--surface)" strokeWidth="2" />}
            </g>
          )}
        </svg>
        {hp && (
          <div
            className="pointer-events-none absolute top-2 rounded-md border border-line-strong bg-surface px-3 py-2 text-xs shadow-sm"
            style={{
              left: `${(g.x(hp.t) / W) * 100}%`,
              transform: g.x(hp.t) > W * 0.6 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
            }}
          >
            <div className="text-ink-3 mb-1">{new Date(hp.t * 1000).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</div>
            {hp.close != null && hp.p50 == null ? (
              <div className="num">
                Cours : <b>{fmtNumber(hp.close, digits)}</b> {currency}
              </div>
            ) : (
              <div className="num space-y-0.5">
                <div>
                  Médiane : <b>{fmtNumber(hp.p50, digits)}</b> <span className="text-ink-3">({fmtPct(((hp.p50 ?? start) / start - 1) * 100, 1)})</span>
                </div>
                <div className="text-ink-2">
                  1 chance sur 2 : {fmtNumber(hp.p25, digits)} – {fmtNumber(hp.p75, digits)}
                </div>
                <div className="text-ink-3">
                  9 chances sur 10 : {fmtNumber(hp.p5, digits)} – {fmtNumber(hp.p95, digits)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 ticker">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 bg-ink" /> Cours réel
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: "var(--chart-line)" }} /> Trajectoire médiane
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "var(--chart-band-2)" }} /> 50 % de probabilité
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "var(--chart-band)" }} /> 90 % de probabilité
        </span>
      </figcaption>
    </figure>
  );
}

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / p;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
}
