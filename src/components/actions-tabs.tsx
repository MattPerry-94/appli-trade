import Link from "next/link";

export function ActionsTabs({ current }: { current: "table" | "map" }) {
  const cls = (on: boolean) => `px-3 py-1 rounded ${on ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"}`;
  return (
    <nav className="flex rounded-md border border-line p-0.5 text-sm" aria-label="Affichage">
      <Link href="/actions" className={cls(current === "table")} aria-current={current === "table" ? "page" : undefined}>
        Tableau
      </Link>
      <Link href="/actions/carte" className={cls(current === "map")} aria-current={current === "map" ? "page" : undefined}>
        Carte
      </Link>
    </nav>
  );
}
