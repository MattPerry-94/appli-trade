import Link from "next/link";
import type { Quote } from "@/lib/yahoo";
import { fmtNumber } from "@/lib/format";
import { Change, Sparkline } from "./ui";

/** Liste compacte de cotations (indices, devises, matières premières). */
export function QuoteList({
  quotes,
  sparks,
  digits,
  names,
}: {
  quotes: Quote[];
  sparks?: Record<string, number[]>;
  digits?: (q: Quote) => number;
  names?: Record<string, string>;
}) {
  return (
    <ul>
      {quotes.map((q) => (
        <li key={q.symbol} className="border-b border-line last:border-0">
          <Link
            href={`/actif/${encodeURIComponent(q.symbol)}`}
            className="grid grid-cols-[1fr_auto_auto] xl:grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 py-2.5 hover:bg-surface-2 -mx-2 px-2 rounded"
          >
            <span className="min-w-0">
              <span className="block truncate">{names?.[q.symbol] ?? q.name}</span>
            </span>
            {sparks && <Sparkline values={sparks[q.symbol] ?? []} width={64} height={22} className="hidden xl:block" />}
            <span className="num text-right">{fmtNumber(q.price, digits ? digits(q) : q.price != null && q.price > 1000 ? 0 : 2)}</span>
            <Change value={q.changePct} className="text-right w-[4.5rem] text-sm" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
