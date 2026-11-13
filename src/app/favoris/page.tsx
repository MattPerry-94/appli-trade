import type { Metadata } from "next";
import { PageTitle } from "@/components/ui";
import { Watchlist } from "@/components/watchlist-view";

export const metadata: Metadata = { title: "Favoris" };

export default function FavorisPage() {
  return (
    <div>
      <PageTitle
        title="Mes favoris"
        subtitle="Les actifs que vous suivez. Ils sont enregistrés dans ce navigateur : pas de compte, rien n’est envoyé ailleurs."
      />
      <Watchlist />
    </div>
  );
}
