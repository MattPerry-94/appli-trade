import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="eyebrow">Erreur 404</p>
      <h1 className="font-serif text-3xl font-semibold mt-2">Introuvable</h1>
      <p className="text-ink-2 mt-3">Cet actif ou cette page n’existe pas, ou ses données sont momentanément indisponibles.</p>
      <p className="mt-6 text-sm">
        <Link href="/" className="link">
          Retour à la vue d’ensemble
        </Link>{" "}
        · Essayez aussi la recherche (Ctrl K).
      </p>
    </div>
  );
}
