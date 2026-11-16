"use client";

import { useRef, useState } from "react";
import { downloadBackup, parseBackup, restoreBackup } from "@/lib/stores";

/** Sauvegarde / restauration des favoris, du portefeuille et des alertes dans un fichier. */
export function BackupControls() {
  const input = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const onFile = async (file: File) => {
    try {
      const data = parseBackup(await file.text());
      const summary = `${data.portfolio.length} position(s), ${data.watchlist.length} favori(s), ${data.alerts.length} alerte(s)`;
      if (!window.confirm(`Remplacer les données de ce navigateur par celles du fichier ?\n\n${summary}`)) return;
      restoreBackup(data);
      setMsg({ text: `Restauré : ${summary}.`, ok: true });
    } catch (e) {
      setMsg({ text: (e as Error).message, ok: false });
    }
  };

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            downloadBackup();
            setMsg({ text: "Fichier enregistré. Ouvrez-le sur un autre appareil avec « Restaurer ».", ok: true });
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-3 py-1.5 text-sm text-ink-2 hover:text-ink hover:border-ink-3"
          title="Enregistre favoris, portefeuille et alertes dans un fichier"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sauvegarder
        </button>
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-3 py-1.5 text-sm text-ink-2 hover:text-ink hover:border-ink-3"
          title="Recharge un fichier de sauvegarde"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M12 20V9m0 0-4 4m4-4 4 4M5 4h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Restaurer
        </button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {msg && <p className={`text-xs ${msg.ok ? "text-ink-3" : "text-down"}`}>{msg.text}</p>}
    </div>
  );
}
