import type { Metadata } from "next";
import { PageTitle } from "@/components/ui";
import { PortfolioView, type Prefill } from "@/components/portfolio-view";
import { BackupControls } from "@/components/backup-controls";

export const metadata: Metadata = { title: "Portefeuille" };

export default async function PortefeuillePage(props: PageProps<"/portefeuille">) {
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const symbol = str("ajouter");
  const prefill: Prefill | null = symbol
    ? {
        kind: str("type") === "coin" ? "coin" : "asset",
        symbol: symbol.slice(0, 80),
        name: (str("nom") ?? symbol).slice(0, 120),
        price: Number(str("prix")) || null,
        currency: str("devise")?.slice(0, 5) ?? null,
      }
    : null;
  return (
    <div>
      <PageTitle
        title="Mon portefeuille"
        subtitle="Saisissez vos achats pour suivre leur valeur, vos plus-values et la répartition de votre épargne. Tout reste dans ce navigateur."
      >
        <BackupControls />
      </PageTitle>
      <PortfolioView prefill={prefill} />
    </div>
  );
}
