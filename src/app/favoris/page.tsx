import type { Metadata } from "next";
import { PageTitle } from "@/components/ui";
import { Watchlist } from "@/components/watchlist-view";
import { AlertsPanel } from "@/components/alerts-panel";
import { BackupControls } from "@/components/backup-controls";

export const metadata: Metadata = { title: "Favoris" };

export default function FavorisPage() {
  return (
    <div className="space-y-14">
      <PageTitle
        title="Mes favoris"
        subtitle="Les actifs que vous suivez et vos alertes de prix. Ils sont enregistrés dans ce navigateur : pas de compte, rien n’est envoyé ailleurs. Utilisez « Sauvegarder » pour les retrouver sur un autre appareil."
      >
        <BackupControls />
      </PageTitle>
      <Watchlist />
      <AlertsPanel />
    </div>
  );
}
