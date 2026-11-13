"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Bar, RangeKey } from "@/lib/yahoo";
import { fmtNumber, fmtPct, trendClass } from "@/lib/format";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "1J", label: "1J" },
  { key: "5J", label: "5J" },
  { key: "1M", label: "1M" },
  { key: "6M", label: "6M" },
  { key: "1A", label: "1A" },
  { key: "5A", label: "5A" },
  { key: "MAX", label: "Max" },
];

function css(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function smaPoints(daily: Bar[], n: number, from: number) {
  const out: { time: UTCTimestamp; value: number }[] = [];
  let sum = 0;
  for (let i = 0; i < daily.length; i++) {
    sum += daily[i].c;
    if (i >= n) sum -= daily[i - n].c;
    if (i >= n - 1 && daily[i].t >= from) out.push({ time: daily[i].t as UTCTimestamp, value: sum / n });
  }
  return out;
}

interface ChartData {
  bars: Bar[];
  currency: string | null;
  gmtoffset: number;
}

export function PriceChart({
  symbol,
  initial,
  initialRange = "1A",
  daily,
  digits,
  fixed = false,
}: {
  /** Période unique (pas de sélecteur), quand seules des données fournies sont disponibles */
  fixed?: boolean;
  symbol: string;
  initial: ChartData;
  initialRange?: RangeKey;
  /** Historique quotidien long pour les moyennes mobiles */
  daily: Bar[];
  digits?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [range, setRange] = useState<RangeKey>(initialRange);
  const [data, setData] = useState<ChartData>(initial);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"line" | "candle">("line");
  const [showMA, setShowMA] = useState(true);
  const [theme, setTheme] = useState(0);
  const [hover, setHover] = useState<{ t: number; c: number; o: number; h: number; l: number } | null>(null);
  const cache = useRef(new Map<RangeKey, ChartData>([[initialRange, initial]]));

  // Changement de période
  useEffect(() => {
    const cached = cache.current.get(range);
    if (cached) {
      setData(cached);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: ChartData) => {
        cache.current.set(range, d);
        setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [range, symbol]);

  // Suivi du thème clair / sombre
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme((t) => t + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const intraday = range === "1J" || range === "5J" || range === "1M";
  const bars = data.bars;
  const shift = intraday ? data.gmtoffset : 0; // afficher l'heure locale de la place

  const perf = useMemo(() => {
    if (bars.length < 2) return null;
    return bars[bars.length - 1].c / bars[0].c - 1;
  }, [bars]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ink3 = css("--ink-3");
    const line = css("--line");
    const up = css("--up");
    const down = css("--down");
    const accent = css("--chart-line");
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: ink3,
        fontFamily: `${css("--font-plex-mono") || "ui-monospace"}, monospace`,
        fontSize: 11,
        attributionLogo: false,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: line } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.22 } },
      timeScale: { borderVisible: false, timeVisible: intraday, secondsVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: ink3, width: 1, style: LineStyle.Dashed, labelBackgroundColor: css("--ink") },
        horzLine: { color: ink3, width: 1, style: LineStyle.Dashed, labelBackgroundColor: css("--ink") },
      },
      localization: {
        locale: "fr-FR",
        priceFormatter: (p: number) => fmtNumber(p, digits),
      },
      handleScroll: false,
      handleScale: false,
    });
    chartRef.current = chart;

    const pts = bars.map((b) => ({ ...b, time: (b.t + shift) as UTCTimestamp }));
    if (mode === "candle") {
      const s = chart.addSeries(CandlestickSeries, {
        upColor: up,
        downColor: down,
        borderVisible: false,
        wickUpColor: up,
        wickDownColor: down,
        priceLineVisible: false,
      });
      s.setData(pts.map((p) => ({ time: p.time, open: p.o, high: p.h, low: p.l, close: p.c })));
    } else {
      const s = chart.addSeries(AreaSeries, {
        lineColor: accent,
        lineWidth: 2,
        topColor: css("--chart-band-2"),
        bottomColor: "rgba(0,0,0,0)",
        priceLineVisible: true,
        priceLineStyle: LineStyle.Dotted,
        priceLineColor: ink3,
        lastValueVisible: true,
      });
      s.setData(pts.map((p) => ({ time: p.time, value: p.c })));
      // Niveau de départ de la période
      if (pts.length) {
        s.createPriceLine({ price: pts[0].c, color: line, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: "" });
      }
    }

    // Volumes
    if (bars.some((b) => b.v > 0)) {
      const vol = chart.addSeries(HistogramSeries, {
        priceScaleId: "vol",
        priceFormat: { type: "volume" },
        lastValueVisible: false,
        priceLineVisible: false,
      });
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.84, bottom: 0 }, visible: false });
      vol.setData(
        pts.map((p, i) => ({
          time: p.time,
          value: p.v,
          color: (i === 0 || p.c >= pts[i - 1].c ? up : down) + "55",
        })),
      );
    }

    // Moyennes mobiles 50 / 200 jours (périodes en données quotidiennes)
    if (showMA && (range === "6M" || range === "1A") && daily.length > 60 && bars.length) {
      const from = bars[0].t;
      const ma50 = chart.addSeries(LineSeries, { color: css("--ink-2"), lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
      ma50.setData(smaPoints(daily, 50, from));
      const ma200 = chart.addSeries(LineSeries, { color: ink3, lineWidth: 1, lineStyle: LineStyle.Dashed, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
      ma200.setData(smaPoints(daily, 200, from));
    }

    chart.timeScale().fitContent();

    const byTime = new Map(pts.map((p) => [p.time as number, p]));
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        setHover(null);
        return;
      }
      const p = byTime.get(param.time as number);
      if (p) setHover({ t: p.t, c: p.c, o: p.o, h: p.h, l: p.l });
    });

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [bars, mode, showMA, range, daily, shift, intraday, theme, digits]);

  const last = bars[bars.length - 1];
  const shown = hover ?? (last ? { t: last.t, c: last.c, o: last.o, h: last.h, l: last.l } : null);
  const fmtT = (t: number) =>
    new Date(t * 1000).toLocaleString("fr-FR", {
      day: "numeric",
      month: "short",
      year: intraday ? undefined : "numeric",
      hour: intraday ? "2-digit" : undefined,
      minute: intraday ? "2-digit" : undefined,
      timeZone: intraday ? "UTC" : "Europe/Paris",
    });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className={`flex rounded-md border border-line p-0.5 text-sm ${fixed ? "invisible" : ""}`} role="tablist" aria-label="Période">
          {RANGES.map((r) => (
            <button
              key={r.key}
              role="tab"
              aria-selected={range === r.key}
              onClick={() => setRange(r.key)}
              className={`px-2.5 py-1 rounded num ${range === r.key ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm">
          {(range === "6M" || range === "1A") && (
            <label className="inline-flex items-center gap-1.5 text-ink-2 cursor-pointer">
              <input type="checkbox" checked={showMA} onChange={(e) => setShowMA(e.target.checked)} className="accent-[var(--accent)]" />
              Moyennes 50/200 j
            </label>
          )}
          <div className="flex rounded-md border border-line p-0.5" role="tablist" aria-label="Type de graphique">
            <button role="tab" aria-selected={mode === "line"} onClick={() => setMode("line")} className={`px-2.5 py-1 rounded ${mode === "line" ? "bg-surface-2 text-ink" : "text-ink-2"}`}>
              Ligne
            </button>
            <button role="tab" aria-selected={mode === "candle"} onClick={() => setMode("candle")} className={`px-2.5 py-1 rounded ${mode === "candle" ? "bg-surface-2 text-ink" : "text-ink-2"}`}>
              Bougies
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm min-h-6 mb-1">
        {shown && (
          <>
            <span className="text-ink-3">{fmtT(shown.t)}</span>
            <span className="num">
              <span className="text-ink-3">Clôture </span>
              {fmtNumber(shown.c, digits)}
            </span>
            {mode === "candle" && (
              <span className="num text-ink-2 hidden sm:inline">
                O {fmtNumber(shown.o, digits)} · H {fmtNumber(shown.h, digits)} · B {fmtNumber(shown.l, digits)}
              </span>
            )}
          </>
        )}
        {perf != null && (
          <span className="ml-auto text-ink-3">
            Sur la période : <span className={`num ${trendClass(perf)}`}>{fmtPct(perf * 100)}</span>
          </span>
        )}
      </div>
      <div className={`relative h-[340px] sm:h-[400px] transition-opacity ${loading ? "opacity-40" : ""}`}>
        <div ref={box} className="absolute inset-0" />
        {!bars.length && !loading && <p className="absolute inset-0 grid place-items-center text-sm text-ink-3">Pas de données pour cette période.</p>}
      </div>
      {showMA && (range === "6M" || range === "1A") && (
        <p className="ticker mt-2 flex gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 h-px bg-ink-2" /> Moyenne 50 jours
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 border-t border-dashed border-ink-3" /> Moyenne 200 jours
          </span>
        </p>
      )}
    </div>
  );
}
