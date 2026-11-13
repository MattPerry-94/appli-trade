import Link from "next/link";
import type { ReactNode } from "react";
import { fmtPct, trendClass } from "@/lib/format";
import { verdictFor } from "@/lib/analysis";

export function Change({ value, className = "", digits = 2 }: { value: number | null | undefined; className?: string; digits?: number }) {
  return <span className={`num ${trendClass(value)} ${className}`}>{fmtPct(value, digits)}</span>;
}

/** Pastille de variation avec fond doux (utilisée pour les gros chiffres). */
export function ChangePill({ value }: { value: number | null | undefined }) {
  const bg = value == null || value === 0 ? "bg-neutral-soft" : value > 0 ? "bg-up-soft" : "bg-down-soft";
  return (
    <span className={`num inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sm font-medium ${bg} ${trendClass(value)}`}>
      <span aria-hidden>{value == null || value === 0 ? "■" : value > 0 ? "▲" : "▼"}</span>
      {fmtPct(value)}
    </span>
  );
}

export function SectionTitle({
  children,
  href,
  hrefLabel = "Tout voir",
  aside,
}: {
  children: ReactNode;
  href?: string;
  hrefLabel?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-ink pb-2 mb-1">
      <h2 className="font-serif text-xl font-semibold tracking-tight">{children}</h2>
      <div className="flex items-center gap-4 text-sm">
        {aside}
        {href && (
          <Link href={href} className="link whitespace-nowrap">
            {hrefLabel} →
          </Link>
        )}
      </div>
    </div>
  );
}

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-ink-2 max-w-2xl">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

/** Mini-courbe en SVG. Une seule série : la couleur suit le sens de la variation. */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  className = "",
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (!values || values.length < 2) return <span className={`inline-block ${className}`} style={{ width, height }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (width - pad * 2) + pad;
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const up = values[values.length - 1] >= values[0];
  const baseY = height - pad - ((values[0] - min) / span) * (height - pad * 2);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <line x1={pad} x2={width - pad} y1={baseY} y2={baseY} stroke="var(--line-strong)" strokeDasharray="2 3" strokeWidth={1} />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={up ? "var(--up)" : "var(--down)"}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Barre de score 0–100 avec repère, libellé et valeur (jamais la couleur seule). */
export function ScoreBar({ score, size = "md" }: { score: number | null; size?: "sm" | "md" }) {
  if (score == null) return <span className="text-ink-3">—</span>;
  const { verdict, tone } = verdictFor(score);
  const color = tone === "up" ? "var(--up)" : tone === "down" ? "var(--down)" : "var(--ink-3)";
  if (size === "sm") {
    return (
      <span className="inline-flex items-center gap-2 justify-end" title={`${verdict} — score ${score}/100`}>
        <span className="relative h-1.5 w-14 rounded-full bg-surface-2 overflow-hidden" aria-hidden>
          <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${score}%`, background: color }} />
        </span>
        <span className="num w-6 text-right text-ink-2">{score}</span>
      </span>
    );
  }
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-serif text-2xl font-semibold" style={{ color }}>
          {verdict}
        </span>
        <span className="num text-ink-2">
          <span className="text-2xl font-semibold text-ink">{score}</span>
          <span className="text-sm">/100</span>
        </span>
      </div>
      <div className="relative mt-3" aria-hidden>
        <div className="h-2 rounded-full overflow-hidden flex gap-[2px]">
          <span className="flex-[35] bg-down-soft" />
          <span className="flex-[10] bg-down-soft opacity-60" />
          <span className="flex-[10] bg-neutral-soft" />
          <span className="flex-[10] bg-up-soft opacity-60" />
          <span className="flex-[35] bg-up-soft" />
        </div>
        <span
          className="absolute top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-sm bg-ink ring-2 ring-surface"
          style={{ left: `calc(${score}% - 1.5px)` }}
        />
      </div>
      <div className="flex justify-between ticker mt-1.5">
        <span>Baissière</span>
        <span>Neutre</span>
        <span>Haussière</span>
      </div>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="py-2.5 border-b border-line flex items-baseline justify-between gap-4">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="num text-right">
        {value}
        {sub && <span className="ml-1.5 text-xs text-ink-3">{sub}</span>}
      </dd>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-ink-3">{children}</p>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "up" | "down" | "accent" }) {
  const cls =
    tone === "up"
      ? "bg-up-soft text-up"
      : tone === "down"
        ? "bg-down-soft text-down"
        : tone === "accent"
          ? "bg-accent-soft text-accent"
          : "bg-neutral-soft text-ink-2";
  return <span className={`inline-block rounded px-1.5 py-0.5 text-[0.7rem] font-mono uppercase tracking-wide ${cls}`}>{children}</span>;
}

export function MarketState({ state }: { state: string | null }) {
  if (!state) return null;
  const open = state === "REGULAR";
  const label = open ? "Ouvert" : state === "PRE" || state === "PREPRE" ? "Pré-ouverture" : state === "POST" || state === "POSTPOST" ? "Après-séance" : "Fermé";
  return (
    <span className="inline-flex items-center gap-1.5 ticker">
      <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-up" : "bg-ink-3"}`} aria-hidden />
      {label}
    </span>
  );
}
