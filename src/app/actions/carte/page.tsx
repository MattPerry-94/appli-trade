import type { Metadata } from "next";
import { getStockRows } from "@/lib/stock-rows";
import { PageTitle } from "@/components/ui";
import { LiveRefresh } from "@/components/live-refresh";
import { ActionsTabs } from "@/components/actions-tabs";
import { SectorMap } from "@/components/sector-map";

export const metadata: Metadata = { title: "Carte des secteurs" };
export const revalidate = 120;

export default async function CartePage() {
  const rows = await getStockRows(false);
  return (
    <div>
      <PageTitle
        title="Carte des secteurs"
        subtitle="Chaque rectangle est une entreprise, sa taille sa capitalisation boursière, sa couleur sa variation. Les valeurs sont regroupées par secteur."
      >
        <div className="flex items-center gap-4">
          <ActionsTabs current="map" />
          <LiveRefresh seconds={120} />
        </div>
      </PageTitle>
      <SectorMap
        rows={rows
          .filter((r) => r.capEur != null && r.capEur > 0)
          .map((r) => ({ symbol: r.symbol, name: r.name, sector: r.sector, region: r.region, cap: r.capEur as number, day: r.changePct, year: r.yearChangePct }))}
      />
    </div>
  );
}
