"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Rafraîchit les données de la page à intervalle régulier, seulement si l'onglet est visible. */
export function LiveRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  const [at, setAt] = useState<string | null>(null);

  useEffect(() => {
    const stamp = () =>
      setAt(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    stamp();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
        stamp();
      }
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);

  return (
    <span className="ticker inline-flex items-center gap-1.5" title={`Actualisation automatique toutes les ${seconds} s`}>
      <span className="h-1.5 w-1.5 rounded-full bg-up animate-pulse" aria-hidden />
      {at ? `Mis à jour à ${at}` : "Actualisation auto"}
    </span>
  );
}
