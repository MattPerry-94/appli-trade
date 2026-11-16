"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ColorType, CrosshairMode, LineSeries, LineStyle, createChart, type IChartApi, type UTCTimestamp } from "lightweight-charts";
import type { Bar } from "@/lib/yahoo";
import { fmtDate, fmtNumber, fmtPct, trendClass } from "@/lib/format";
import { maxDrawdown } from "@/lib/indicators";
import { SymbolPicker, type PickedHit } from "./symbol-picker";

type Range = "1A" | "5A" | "MAX";
const RANGES: { key: Range; label: string }[] = [
  { key: "1A", label: "1 an" },
  { key: "5A", label: "5 ans" },
  { key: "MAX", label: "Max" },
];
const MAX_SERIES = 5;

function css(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

interface Loaded {
  bars: Bar[];
  currency: string | null;
}

interface SeriesStats {
  symbol: string;
  name: string;
  slot: number;
  points: { t: number; v: number }[];
  perf: number | null;
  annualized: number | null;
  vol: number | null;
  maxDD: number | null;
  missing: boolean;
}

/** Ramène chaque série à 100 au début de la période commune et calcule ses statistiques. */
function buildStats(symbols: string[], names: Record<string, string>, data: Record<string, Loaded | null | undefined>, slots: Record<string, number>) {
  const loaded = symbols.filter((s) => (data[s]?.bars.length ?? 0) > 2);
  const start = loaded.length ? Math.max(...loaded.map((s) => data[s]!.bars[0].t)) : 0;
  return symbols.map((s): SeriesStats => {
    const bars = (data[s]?.bars ?? []).filter((b) => b.t >= start);
    const base = bars[0]?.c;
    const points = base ? bars.map((b) => ({ t: b.t, v: (b.c / base) * 100 })) : [];
    const closes = bars.map((b) => b.c);
    const years = bars.length > 1 ? (bars[bars.length - 1].t - bars[0].t) / (365.25 * 86400) : 0;
    const perf = closes.length > 1 ? closes[closes.length - 1] / closes[0] - 1 : null;
    let vol: number | null = null;
    if (closes.length > 10 && years > 0) {
      const rets = closes.slice(1).map((c, i) => Math.log(c / closes[i]));
      const m = rets.reduce((a, b) => a + b, 0) / rets.length;
      const sd = Math.sqrt(rets.reduce((a, b) => a + (b - m) ** 2, 0) / (rets.length - 1));
      vol = sd * Math.sqrt(rets.length / years);
    }
    return {
      symbol: s,
      name: names[s] ?? s,
      slot: slots[s] ?? 1,
      points,
      perf,
      annualized: perf != null && years >= 1.5 ? Math.pow(1 + perf, 1 / years) - 1 : null,
      vol,
      maxDD: closes.length > 2 ? maxDrawdown(closes) : null,
      missing: data[s] === null || (data[s] !== undefined && points.length < 2),
    };
  });
}

export function Comparator({ initialSymbols, initialNames, initialRange }: { initialSymbols: string[]; initialNames: Record<string, string>; initialRange: Range }) {
  const [symbols, setSymbols] = useState(initialSymbols);
  const [names, setNames] = useState(initialNames);
  const [range, setRange] = useState<Range>(initialRange);
  const [data, setData] = useState<Record<string, Loaded | null>>({});
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(0);
  const [hover, setHover] = useState<{ t: number; values: Record<string, number> } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const cache = useRef(new Map<string, Loaded | null>());

  // La couleur suit l'actif, pas son rang : un emplacement est attribué à l'ajout et conservé.
  const [slots, setSlots] = useState<Record<string, number>>(() => Object.fromEntries(initialSymbols.map((s, i) => [s, i + 1])));

  // Synchronisation de l'adresse (partageable), sans recharger la page
  useEffect(() => {
    const qs = new URLSearchParams({ s: symbols.join(","), p: range });
    window.history.replaceState(null, "", `/comparer?${qs.toString()}`);
  }, [symbols, range]);

  // Chargement des historiques
  useEffect(() => {
    let alive = true;
    const todo = symbols.filter((s) => !cache.current.has(`${s}|${range}`));
    const apply = () => {
      if (!alive) return;
      setData(Object.fromEntries(symbols.map((s) => [s, cache.current.get(`${s}|${range}`) ?? null])));
    };
    if (!todo.length) {
      apply();
      return;
    }
    setLoading(true);
    Promise.all(
      todo.map((s) =>
        fetch(`/api/chart?symbol=${encodeURIComponent(s)}&range=${range}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d: Loaded | null) => cache.current.set(`${s}|${range}`, d && d.bars?.length ? d : null))
          .catch(() => cache.current.set(`${s}|${range}`, null)),
      ),
    ).then(() => {
      apply();
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [symbols, range]);

  // Noms manquants (symbole saisi dans l'adresse)
  const asked = useRef(new Set<string>());
  useEffect(() => {
    const missing = symbols.filter((s) => !names[s] && !asked.current.has(s));
    if (!missing.length) return;
    missing.forEach((s) => asked.current.add(s));
    fetch(`/api/quotes?spark=0&symbols=${encodeURIComponent(missing.join(","))}`)
      .then((r) => r.json())
      .then((j: { quotes: { symbol: string; name: string }[] }) => setNames((n) => ({ ...n, ...Object.fromEntries(j.quotes.map((q) => [q.symbol, q.name])) })))
      .catch(() => {});
  }, [symbols, names]);

  useEffect(() => {
    const obs = new MutationObserver(() => setTheme((t) => t + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const stats = useMemo(() => buildStats(symbols, names, data, slots), [symbols, names, data, slots]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ink3 = css("--ink-3");
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: ink3,
        fontFamily: `${css("--font-plex-mono") || "ui-monospace"}, monospace`,
        fontSize: 11,
        attributionLogo: false,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: css("--line") } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.08 } },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: ink3, width: 1, style: LineStyle.Dashed, labelBackgroundColor: css("--ink") },
        horzLine: { visible: false, labelVisible: false },
      },
      localization: { locale: "fr-FR", priceFormatter: (v: number) => fmtNumber(v, 0) },
      handleScroll: false,
      handleScale: false,
    });
    chartRef.current = chart;
    // Ligne de base 100
    const visible = stats.filter((s) => s.points.length > 1);
    visible.forEach((s, i) => {
      const series = chart.addSeries(LineSeries, {
        color: css(`--series-${s.slot}`),
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        title: s.name.length > 14 ? `${s.name.slice(0, 13)}…` : s.name,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: css("--surface"),
        crosshairMarkerBorderWidth: 2,
      });
      series.setData(s.points.map((p) => ({ time: p.t as UTCTimestamp, value: p.v })));
      if (i === 0) series.createPriceLine({ price: 100, color: css("--line-strong"), lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: "" });
    });
    chart.timeScale().fitContent();
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        setHover(null);
        return;
      }
      const t = param.time as number;
      const values: Record<string, number> = {};
      for (const s of visible) {
        // valeur la plus proche à cette date (les séries n'ont pas toutes les mêmes jours de cotation)
        let lo = 0;
        let hi = s.points.length - 1;
        while (lo < hi) {
          const mid = (lo + hi + 1) >> 1;
          if (s.points[mid].t <= t) lo = mid;
          else hi = mid - 1;
        }
        if (s.points[lo] && s.points[lo].t <= t) values[s.symbol] = s.points[lo].v;
      }
      setHover({ t, values });
    });
    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [stats, theme]);

  const add = (h: PickedHit) => {
    const sym = h.type === "COIN" ? `${h.symbol.toUpperCase()}-EUR` : h.symbol;
    if (symbols.includes(sym) || symbols.length >= MAX_SERIES) return;
    const used = new Set(symbols.map((s) => slots[s]));
    const free = [1, 2, 3, 4, 5].find((n) => !used.has(n)) ?? 1;
    setSlots((sl) => ({ ...sl, [sym]: free }));
    setNames((n) => ({ ...n, [sym]: h.name }));
    setSymbols((s) => [...s, sym]);
  };
  const remove = (sym: string) => setSymbols((s) => s.filter((x) => x !== sym));

  const best = stats.filter((s) => s.perf != null).sort((a, b) => (b.perf ?? 0) - (a.perf ?? 0))[0];
  const start = stats.find((s) => s.points.length)?.points[0]?.t;

  return (
    <div>
      {/* Contrôles : une seule ligne au-dessus du graphique */}
      <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-line">
        <div className="flex rounded-md border border-line p-0.5 text-sm" role="tablist" aria-label="Période">
          {RANGES.map((r) => (
            <button
              key={r.key}
              role="tab"
              aria-selected={range === r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1 rounded ${range === r.key ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <SymbolPicker
          onPick={add}
          disabled={symbols.length >= MAX_SERIES}
          placeholder={symbols.length >= MAX_SERIES ? "5 actifs maximum" : "Ajouter un actif…"}
          className="w-full sm:w-72"
        />
        {loading && <span className="ticker">Chargement…</span>}
      </div>

      {/* Légende (toujours visible) + valeurs au survol */}
      <ul className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-sm" aria-label="Séries comparées">
        {stats.map((s) => {
          const hv = hover?.values[s.symbol];
          return (
            <li key={s.symbol} className="inline-flex items-center gap-2">
              <span className="inline-block h-[3px] w-4 rounded-full" style={{ background: `var(--series-${s.slot})` }} aria-hidden />
              <span className={s.missing ? "text-ink-3 line-through" : ""}>{s.name}</span>
              <span className={`num ${trendClass(hv != null ? hv - 100 : s.perf)}`}>
                {hv != null ? fmtPct(hv - 100, 1) : s.perf != null ? fmtPct(s.perf * 100, 1) : ""}
              </span>
              <button type="button" onClick={() => remove(s.symbol)} className="text-ink-3 hover:text-ink px-1" aria-label={`Retirer ${s.name}`}>
                ×
              </button>
            </li>
          );
        })}
      </ul>
      <p className="ticker mt-1 h-4">{hover ? fmtDate(hover.t * 1000, { day: "numeric", month: "long", year: "numeric" }) : start ? `Base 100 au ${fmtDate(start * 1000)}` : ""}</p>

      <div ref={box} className="h-[380px] sm:h-[440px] mt-2" />

      {best && best.perf != null && stats.filter((s) => s.perf != null).length > 1 && (
        <p className="mt-4 text-ink-2 max-w-3xl leading-relaxed">
          Sur la période, <b className="text-ink font-medium">{best.name}</b> a le mieux progressé ({fmtPct(best.perf * 100, 1)}).
          {best.vol != null && ` Sa volatilité annuelle de ${fmtNumber(best.vol * 100, 0)} % donne une idée des secousses à supporter.`}
        </p>
      )}

      {/* Tableau : la même information, lisible sans couleur */}
      <div className="scroll-x mt-6">
        <table className="data-table text-sm min-w-[560px]">
          <thead>
            <tr>
              <th>Actif</th>
              <th>Performance</th>
              <th>Par an</th>
              <th>Volatilité / an</th>
              <th>Pire baisse</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.symbol}>
                <td>
                  <Link href={`/actif/${encodeURIComponent(s.symbol)}`} className="inline-flex items-center gap-2 hover:text-accent">
                    <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: `var(--series-${s.slot})` }} aria-hidden />
                    <span className="font-medium">{s.name}</span>
                    <span className="ticker">{s.symbol}</span>
                  </Link>
                  {s.missing && <span className="ticker ml-2">données indisponibles</span>}
                </td>
                <td className={`num ${trendClass(s.perf)}`}>{s.perf != null ? fmtPct(s.perf * 100, 1) : "—"}</td>
                <td className={`num ${trendClass(s.annualized)}`}>{s.annualized != null ? fmtPct(s.annualized * 100, 1) : "—"}</td>
                <td className="num text-ink-2">{s.vol != null ? `${fmtNumber(s.vol * 100, 0)} %` : "—"}</td>
                <td className="num text-down">{s.maxDD != null ? fmtPct(s.maxDD * 100, 1) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ticker mt-3 leading-relaxed">
        Toutes les séries démarrent à la même date (la plus récente des dates de début disponibles). Performances dans la devise de
        cotation de chaque actif, hors dividendes pour les indices et actions. « Par an » : affiché à partir de 18 mois d’historique.
      </p>
    </div>
  );
}
