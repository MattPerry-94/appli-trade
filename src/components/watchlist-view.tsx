"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWatchlist } from "@/lib/watchlist";
import type { Quote } from "@/lib/yahoo";
import type { Coin } from "@/lib/coingecko";
import { fmtPrice } from "@/lib/format";
import { Change, ScoreBar, SectionTitle, Sparkline } from "./ui";
import { WatchButton } from "./watch-button";

type QuoteRow = Quote & { score: number | null; spark: number[] };
type CoinRow = Coin & { score: number | null };

export function Watchlist() {
  const { items } = useWatchlist();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [coins, setCoins] = useState<CoinRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const assetIds = items.filter((i) => i.kind === "asset").map((i) => i.id).join(",");
  const coinIds = items.filter((i) => i.kind === "coin").map((i) => i.id).join(",");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const [q, c] = await Promise.all([
          assetIds ? fetch(`/api/quotes?symbols=${encodeURIComponent(assetIds)}`).then((r) => r.json()) : { quotes: [] },
          coinIds ? fetch(`/api/coins?ids=${encodeURIComponent(coinIds)}`).then((r) => r.json()) : { coins: [] },
        ]);
        if (!alive) return;
        setQuotes(q.quotes ?? []);
        setCoins(c.coins ?? []);
      } finally {
        if (alive) {
          setLoading(false);
          setReady(true);
        }
      }
    };
    load();
    const id = setInterval(() => document.visibilityState === "visible" && load(), 90_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [assetIds, coinIds]);

  if (!items.length) {
    return (
      <div className="border border-dashed border-line-strong rounded-lg py-14 px-6 text-center">
        <p className="font-serif text-xl">Aucun favori pour l’instant</p>
        <p className="text-ink-2 mt-2 max-w-md mx-auto text-sm leading-relaxed">
          Cliquez sur l’étoile à côté d’une action, d’un indice ou d’une crypto (ou sur « Suivre » dans sa fiche) pour
          la retrouver ici.
        </p>
        <div className="mt-5 flex justify-center gap-3 text-sm">
          <Link href="/actions" className="link">
            Parcourir les actions →
          </Link>
          <Link href="/crypto" className="link">
            Parcourir les cryptos →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-10 transition-opacity ${loading && !ready ? "opacity-50" : ""}`}>
      {assetIds && (
        <section>
          <SectionTitle>Bourse</SectionTitle>
          <div className="scroll-x">
            <table className="data-table text-sm">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Cours</th>
                  <th>Jour</th>
                  <th className="hidden sm:table-cell">1 an</th>
                  <th className="hidden md:table-cell">1 mois</th>
                  <th>Tendance</th>
                  <th aria-label="Favori" />
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.symbol}>
                    <td>
                      <Link href={`/actif/${encodeURIComponent(q.symbol)}`} className="hover:text-accent">
                        <span className="font-medium">{q.name}</span>
                        <span className="ticker ml-2">{q.symbol}</span>
                      </Link>
                    </td>
                    <td>{fmtPrice(q.price, q.currency)}</td>
                    <td>
                      <Change value={q.changePct} />
                    </td>
                    <td className="hidden sm:table-cell">
                      <Change value={q.yearChangePct} digits={1} />
                    </td>
                    <td className="hidden md:table-cell">
                      <Sparkline values={q.spark} width={88} height={22} className="ml-auto" />
                    </td>
                    <td>
                      <ScoreBar score={q.score} size="sm" />
                    </td>
                    <td className="w-8">
                      <WatchButton compact item={{ kind: "asset", id: q.symbol, name: q.name }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {coinIds && (
        <section>
          <SectionTitle>Crypto</SectionTitle>
          <div className="scroll-x">
            <table className="data-table text-sm">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Prix</th>
                  <th>24 h</th>
                  <th className="hidden sm:table-cell">30 j</th>
                  <th className="hidden md:table-cell">7 jours</th>
                  <th>Tendance</th>
                  <th aria-label="Favori" />
                </tr>
              </thead>
              <tbody>
                {coins.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/crypto/${c.id}`} className="hover:text-accent">
                        <span className="font-medium">{c.name}</span>
                        <span className="ticker ml-2">{c.symbol}</span>
                      </Link>
                    </td>
                    <td>{fmtPrice(c.price, "EUR")}</td>
                    <td>
                      <Change value={c.ch24h} />
                    </td>
                    <td className="hidden sm:table-cell">
                      <Change value={c.ch30d} />
                    </td>
                    <td className="hidden md:table-cell">
                      <Sparkline values={c.spark} width={88} height={22} className="ml-auto" />
                    </td>
                    <td>
                      <ScoreBar score={c.score} size="sm" />
                    </td>
                    <td className="w-8">
                      <WatchButton compact item={{ kind: "coin", id: c.id, name: c.name }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
