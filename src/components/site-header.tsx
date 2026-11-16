"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { SearchDialog } from "./search-dialog";

const NAV = [
  { href: "/", label: "Vue d'ensemble" },
  { href: "/marches", label: "Marchés" },
  { href: "/actions", label: "Actions" },
  { href: "/etf", label: "ETF" },
  { href: "/crypto", label: "Crypto" },
  { href: "/comparer", label: "Comparer" },
  { href: "/portefeuille", label: "Portefeuille" },
  { href: "/favoris", label: "Favoris" },
  { href: "/actualites", label: "Actualités" },
  { href: "/calendrier", label: "Calendrier" },
];

export function SiteHeader() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <header className="bg-surface border-b border-line sticky top-0 z-30">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-4 h-14">
          <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Boussole, accueil">
            <Logo />
            <span className="font-serif text-xl font-semibold tracking-tight">Boussole</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <SearchDialog />
            <ThemeToggle />
          </div>
        </div>
        <nav className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-1 pb-2 scroll-x text-sm" aria-label="Navigation principale">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active(n.href) ? "page" : undefined}
              className={`px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
                active(n.href) ? "text-ink bg-surface-2 font-medium" : "text-ink-2 hover:text-ink"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 4.5 14.2 12 12 19.5 9.8 12Z" fill="var(--accent)" />
      <path d="M12 12 14.2 12 12 19.5Z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}
