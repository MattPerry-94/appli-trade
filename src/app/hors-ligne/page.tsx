import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Hors ligne" };
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="py-16 max-w-xl">
      <p className="eyebrow">Pas de connexion</p>
      <h1 className="font-serif text-3xl font-semibold mt-2">Vous êtes hors ligne</h1>
      <p className="mt-4 text-ink-2 leading-relaxed">
        Les cours ont besoin d’une connexion internet pour être mis à jour. Vos favoris, votre portefeuille et vos alertes restent
        enregistrés dans ce navigateur : ils réapparaîtront dès le retour du réseau.
      </p>
      <Link href="/" className="link mt-6 inline-block">
        Réessayer →
      </Link>
    </div>
  );
}
