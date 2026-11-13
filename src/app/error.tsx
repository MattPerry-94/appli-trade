"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-20 text-center">
      <p className="eyebrow">Incident</p>
      <h1 className="font-serif text-3xl font-semibold mt-2">Les données n’ont pas pu être chargées</h1>
      <p className="text-ink-2 mt-3">Une source de données ne répond pas pour le moment. Réessayez dans quelques instants.</p>
      <button type="button" onClick={reset} className="mt-6 rounded-md border border-line-strong px-4 py-2 text-sm hover:border-ink-3">
        Réessayer
      </button>
    </div>
  );
}
