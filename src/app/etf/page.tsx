import type { Metadata } from "next";
import { getQuotes, getSparks } from "@/lib/yahoo";
import { quickStockScore } from "@/lib/analysis";
import { ETFS, ETF_CATEGORIES } from "@/lib/universe";
import { logReturns, stdev } from "@/lib/indicators";
import { PageTitle } from "@/components/ui";
import { EtfScreener, type EtfRow } from "@/components/etf-screener";
import { LiveRefresh } from "@/components/live-refresh";

export const metadata: Metadata = { title: "ETF" };
export const revalidate = 300;

export default async function EtfPage(props: PageProps<"/etf">) {
  const sp = await props.searchParams;
  const symbols = ETFS.map((e) => e.symbol);
  const [quotes, weekly] = await Promise.all([getQuotes(symbols), getSparks(symbols, "5y", "1wk")]);
  const by = new Map(quotes.map((q) => [q.symbol, q]));
  const rows: EtfRow[] = ETFS.map((e) => {
    const q = by.get(e.symbol);
    const w = weekly[e.symbol] ?? [];
    const years = w.length / 52;
    const perf5 = w.length > 200 ? w[w.length - 1] / w[0] - 1 : null;
    const last52 = w.slice(-53);
    const vol = last52.length > 40 ? stdev(logReturns(last52)) * Math.sqrt(52) : null;
    return {
      ...e,
      ter: q?.ter ?? e.ter ?? null,
      price: q?.price ?? null,
      currency: q?.currency ?? null,
      changePct: q?.changePct ?? null,
      yearChangePct: q?.yearChangePct ?? null,
      annualized5y: perf5 != null && years >= 4 ? (Math.pow(1 + perf5, 1 / years) - 1) * 100 : null,
      vol: vol != null ? vol * 100 : null,
      score: q ? quickStockScore(q) : null,
      spark: w.slice(-53),
    };
  });
  const pea = sp.pea === "1";
  return (
    <div>
      <PageTitle
        title="ETF"
        subtitle="Des fonds indiciels courants, accessibles depuis la France : un seul achat pour détenir tout un marché. Frais, performances et risque côte à côte."
      >
        <LiveRefresh seconds={300} />
      </PageTitle>
      <EtfScreener rows={rows} categories={ETF_CATEGORIES} initialPea={pea} />
      <div className="mt-10 grid gap-6 md:grid-cols-3 text-sm text-ink-2 leading-relaxed">
        <div>
          <h2 className="font-serif text-lg font-semibold text-ink">PEA ou compte-titres ?</h2>
          <p className="mt-2">
            Le PEA n’accepte que des fonds investis au moins à 75 % en actions européennes. Les ETF « PEA » sur le monde ou les
            États-Unis y parviennent grâce à un mécanisme d’échange de performance (« swap »). Après 5 ans, les gains d’un PEA ne
            supportent que les prélèvements sociaux.
          </p>
        </div>
        <div>
          <h2 className="font-serif text-lg font-semibold text-ink">Les frais comptent</h2>
          <p className="mt-2">
            Les frais courants sont prélevés chaque année dans la valeur du fonds. Sur 20 ans, 0,5 % de frais en plus coûte environ
            10 % du capital final. À exposition égale, le moins cher l’emporte souvent.
          </p>
        </div>
        <div>
          <h2 className="font-serif text-lg font-semibold text-ink">Lire les colonnes</h2>
          <p className="mt-2">
            « 5 ans / an » : performance annuelle moyenne sur 5 ans. « Risque » : volatilité sur un an, c’est-à-dire l’amplitude
            habituelle des variations (environ 15 % pour un ETF actions monde). Les performances passées ne préjugent pas des
            performances futures.
          </p>
        </div>
      </div>
      <p className="ticker mt-6 leading-relaxed">
        Éligibilité PEA et frais indicatifs : à vérifier dans le document d’informations clés (DIC) de l’émetteur avant tout achat.
        Frais fournis par Yahoo Finance quand ils sont disponibles.
      </p>
    </div>
  );
}
