import type { Metadata } from "next";
import { getQuotes } from "@/lib/yahoo";
import { PageTitle } from "@/components/ui";
import { Comparator } from "@/components/comparator";

export const metadata: Metadata = { title: "Comparer" };

const DEFAULT = ["^FCHI", "^GSPC", "^N225", "BTC-EUR"];
const MAX_SERIES = 5;

export default async function ComparerPage(props: PageProps<"/comparer">) {
  const sp = await props.searchParams;
  const raw = typeof sp.s === "string" ? sp.s : "";
  const symbols = Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && s.length <= 30),
    ),
  ).slice(0, MAX_SERIES);
  const list = symbols.length ? symbols : DEFAULT;
  const range = sp.p === "1A" || sp.p === "MAX" ? sp.p : "5A";
  const quotes = await getQuotes(list);
  const names = Object.fromEntries(quotes.map((q) => [q.symbol, q.name]));
  return (
    <div>
      <PageTitle
        title="Comparer"
        subtitle="Jusqu’à cinq actifs sur un même graphique, ramenés à une base 100 au début de la période : on voit d’un coup d’œil lequel a le mieux progressé, et au prix de quelles secousses."
      />
      <Comparator initialSymbols={list} initialNames={names} initialRange={range} />
    </div>
  );
}
