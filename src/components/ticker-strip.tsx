import Link from "next/link";
import { getQuotes } from "@/lib/yahoo";
import { getCoins } from "@/lib/coingecko";
import { fmtNumber, fmtPct, trendClass } from "@/lib/format";

const SYMBOLS = ["^FCHI", "^STOXX50E", "^GSPC", "^IXIC", "^N225", "^HSI", "EURUSD=X", "GC=F", "BZ=F"];

export async function TickerStrip() {
  const [quotes, coins] = await Promise.all([getQuotes(SYMBOLS), getCoins()]);
  const items = [
    ...quotes.map((q) => ({
      href: `/actif/${encodeURIComponent(q.symbol)}`,
      name: q.name,
      price: q.price,
      digits: q.symbol.includes("=X") ? 4 : q.price != null && q.price > 1000 ? 0 : 2,
      ch: q.changePct,
    })),
    ...coins
      .filter((c) => c.id === "bitcoin" || c.id === "ethereum")
      .map((c) => ({ href: `/crypto/${c.id}`, name: c.name, price: c.price, digits: 0, ch: c.ch24h })),
  ];
  if (!items.length) return null;
  return (
    <div className="border-b border-line bg-bg">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 scroll-x">
        <ul className="flex gap-6 py-2 text-[0.8rem] whitespace-nowrap">
          {items.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="inline-flex items-baseline gap-2 hover:text-accent">
                <span className="text-ink-2">{i.name}</span>
                <span className="num">{fmtNumber(i.price, i.digits)}</span>
                <span className={`num ${trendClass(i.ch)}`}>{fmtPct(i.ch)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
