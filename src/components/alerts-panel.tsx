"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { alertsStore } from "@/lib/stores";
import { fmtDate, fmtPrice } from "@/lib/format";
import { SectionTitle } from "./ui";

/** Liste des alertes de prix, avec réactivation et suppression. */
export function AlertsPanel() {
  const alerts = alertsStore.use();
  const [asked, setPerm] = useState<string | null>(null);
  const sysPerm = useSyncExternalStore(noop, notifPermission, () => null);
  const perm = asked ?? sysPerm;

  const remove = (id: string) => alertsStore.write(alertsStore.read().filter((a) => a.id !== id));
  const rearm = (id: string) =>
    alertsStore.write(alertsStore.read().map((a) => (a.id === id ? { ...a, triggeredAt: undefined, triggeredPrice: undefined } : a)));

  const sorted = [...alerts].sort((a, b) => Number(Boolean(a.triggeredAt)) - Number(Boolean(b.triggeredAt)) || b.createdAt - a.createdAt);

  return (
    <section>
      <SectionTitle>Alertes de prix</SectionTitle>
      {!alerts.length ? (
        <p className="py-6 text-sm text-ink-3 leading-relaxed max-w-2xl">
          Aucune alerte. Sur la fiche d’un actif, le bouton « Alerte » vous prévient quand le cours dépasse un seuil ou passe dessous.
        </p>
      ) : (
        <ul>
          {sorted.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 border-b border-line text-sm">
              <span className={`h-2 w-2 rounded-full ${a.triggeredAt ? "bg-ink-3" : "bg-up"}`} aria-hidden />
              <Link href={a.kind === "coin" ? `/crypto/${a.symbol}` : `/actif/${encodeURIComponent(a.symbol)}`} className="font-medium hover:text-accent">
                {a.name}
              </Link>
              <span className="text-ink-2">
                {a.direction === "above" ? "au-dessus de" : "en dessous de"} <span className="num">{fmtPrice(a.threshold, a.currency)}</span>
              </span>
              <span className="ticker">
                {a.triggeredAt
                  ? `déclenchée le ${fmtDate(a.triggeredAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} (${fmtPrice(a.triggeredPrice, a.currency)})`
                  : "active"}
              </span>
              <span className="ml-auto flex gap-3">
                {a.triggeredAt && (
                  <button type="button" onClick={() => rearm(a.id)} className="link text-xs">
                    Réactiver
                  </button>
                )}
                <button type="button" onClick={() => remove(a.id)} className="text-xs text-ink-3 hover:text-down">
                  Supprimer
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="ticker mt-3 leading-relaxed max-w-3xl">
        Les alertes sont vérifiées toutes les 2 minutes tant qu’un onglet Boussole est ouvert (pas de serveur ni de compte : elles ne
        peuvent pas vous prévenir quand le site est fermé).
        {perm === "default" && (
          <>
            {" "}
            <button
              type="button"
              className="link"
              onClick={async () => {
                try {
                  setPerm(await Notification.requestPermission());
                } catch {
                  /* non pris en charge */
                }
              }}
            >
              Autoriser les notifications du navigateur
            </button>
          </>
        )}
        {perm === "denied" && " Les notifications du navigateur sont bloquées : seules les alertes affichées dans la page fonctionneront."}
      </p>
    </section>
  );
}

const noop = () => () => {};
const notifPermission = () => ("Notification" in window ? Notification.permission : null);
