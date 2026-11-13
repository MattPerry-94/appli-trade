import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { TickerStrip } from "@/components/ticker-strip";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: { default: "Boussole — marchés, actions & crypto", template: "%s · Boussole" },
  description:
    "Cours des bourses européennes, américaines et asiatiques, des cryptomonnaies, des devises et des matières premières, avec des tendances expliquées.",
};

export const viewport: Viewport = {
  themeColor: [{ color: "#f6f5f1" }],
};

// Appliqué avant le premier rendu pour éviter un flash au chargement.
const themeScript = `try{if(localStorage.getItem("theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${plexSans.variable} ${plexMono.variable} ${serif.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <SiteHeader />
        <TickerStrip />
        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 pt-6 pb-16">{children}</main>
        <footer className="border-t border-line">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 grid gap-6 sm:grid-cols-[1fr_auto] text-sm text-ink-3">
            <p className="max-w-2xl leading-relaxed">
              Les informations et tendances affichées sont calculées automatiquement à partir de données publiques et
              d’indicateurs historiques. Elles ne constituent pas un conseil en investissement. Les cours peuvent être
              différés (jusqu’à 15–20 minutes selon les places).
            </p>
            <nav className="flex gap-5 sm:justify-end">
              <Link href="/methode" className="hover:text-ink">
                Méthode
              </Link>
              <Link href="/calendrier" className="hover:text-ink">
                Calendrier
              </Link>
              <Link href="/favoris" className="hover:text-ink">
                Favoris
              </Link>
            </nav>
            <p className="ticker sm:col-span-2">
              Données : Yahoo Finance, CoinGecko, alternative.me, flux RSS des médias cités.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
