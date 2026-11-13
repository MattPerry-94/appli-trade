export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Chargement">
      <div className="h-4 w-40 rounded bg-surface-2" />
      <div className="h-9 w-72 rounded bg-surface-2" />
      <div className="grid gap-6 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="h-8 rounded bg-surface-2" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
