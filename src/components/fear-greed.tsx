import type { FearGreed } from "@/lib/coingecko";

/** Indice peur / avidité : valeur, libellé, échelle et historique 90 jours. */
export function FearGreedCard({ data }: { data: FearGreed | null }) {
  if (!data) return <p className="text-sm text-ink-3 py-4">Indice indisponible pour le moment.</p>;
  const v = data.value;
  const color = v <= 45 ? "var(--down)" : v >= 55 ? "var(--up)" : "var(--ink-2)";
  const h = data.history;
  const W = 280;
  const H = 56;
  const pts = h.map((p, i) => `${((i / Math.max(h.length - 1, 1)) * W).toFixed(1)},${(H - (p.value / 100) * H).toFixed(1)}`);
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="num font-serif text-5xl font-semibold" style={{ color }}>
          {v}
        </span>
        <span className="text-lg">{data.label}</span>
      </div>
      <div className="relative mt-4" aria-hidden>
        <div className="h-1.5 rounded-full flex gap-[2px] overflow-hidden">
          <span className="flex-[25] bg-down-soft" />
          <span className="flex-[20] bg-down-soft opacity-60" />
          <span className="flex-[10] bg-neutral-soft" />
          <span className="flex-[20] bg-up-soft opacity-60" />
          <span className="flex-[25] bg-up-soft" />
        </div>
        <span className="absolute top-1/2 -translate-y-1/2 h-3.5 w-[3px] rounded-sm bg-ink ring-2 ring-surface" style={{ left: `calc(${v}% - 1.5px)` }} />
      </div>
      <div className="flex justify-between ticker mt-1.5">
        <span>Peur extrême</span>
        <span>Avidité extrême</span>
      </div>
      {h.length > 2 && (
        <figure className="mt-5">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14" preserveAspectRatio="none" role="img" aria-label="Évolution de l'indice sur 90 jours">
            <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="var(--line-strong)" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
            <polyline points={pts.join(" ")} fill="none" stroke="var(--chart-line)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
          <figcaption className="flex justify-between ticker mt-1">
            <span>il y a 90 jours</span>
            <span>aujourd’hui</span>
          </figcaption>
        </figure>
      )}
      <p className="mt-4 text-sm text-ink-2 leading-relaxed">
        Mesure l’humeur du marché crypto (volatilité, volumes, réseaux sociaux, dominance du bitcoin). Les extrêmes sont
        souvent lus à contre-courant.
      </p>
    </div>
  );
}
