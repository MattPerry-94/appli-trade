import type { Metadata } from "next";
import { SECTORS, STOCKS } from "@/lib/universe";
import { getStockRows } from "@/lib/stock-rows";
import { PageTitle } from "@/components/ui";
import { StockScreener } from "@/components/stock-screener";
import { LiveRefresh } from "@/components/live-refresh";
import { ActionsTabs } from "@/components/actions-tabs";

export const metadata: Metadata = { title: "Actions" };
export const revalidate = 120;

export default async function ActionsPage(props: PageProps<"/actions">) {
  const sp = await props.searchParams;
  const rows = await getStockRows();
  const sort = typeof sp.tri === "string" ? sp.tri : undefined;
  const region = typeof sp.region === "string" ? sp.region : undefined;
  return (
    <div>
      <PageTitle
        title="Actions"
        subtitle={`${STOCKS.length} grandes valeurs d’Europe, des États-Unis et d’Asie-Pacifique. Triez, filtrez, puis ouvrez une fiche pour l’analyse complète.`}
      >
        <div className="flex items-center gap-4">
          <ActionsTabs current="table" />
          <LiveRefresh seconds={120} />
        </div>
      </PageTitle>
      <StockScreener rows={rows} sectors={SECTORS} initialSort={sort} initialRegion={region} />
    </div>
  );
}
