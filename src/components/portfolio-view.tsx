"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { portfolioStore } from "@/lib/stores";
import { newId } from "@/lib/local-store";
import { breakdown, valuePositions, type Position, type PositionView } from "@/lib/portfolio";
import { useLivePrices } from "@/lib/use-live-prices";
import { fmtDate, fmtNumber, fmtPct, fmtPrice, trendClass } from "@/lib/format";
import { Change, SectionTitle } from "./ui";
import { SymbolPicker, coinIdOf, type PickedHit } from "./symbol-picker";

export interface Prefill {
  kind: "asset" | "coin";
  symbol: string;
  name: string;
  price: number | null;
  currency: string | null;
}

const parseNum = (s: string) => {
  const v = parseFloat(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(v) ? v : NaN;
};
const todayIso = () => new Date().toISOString().slice(0, 10);
const fmtEur = (v: number | null | undefined, digits = 2) => fmtPrice(v, "EUR", digits);
const signedEur = (v: number | null | undefined) =>
  v == null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtPrice(Math.abs(v), "EUR", 2)}`;

export function PortfolioView({ prefill }: { prefill: Prefill | null }) {
  const positions = portfolioStore.use();
  const [editing, setEditing] = useState<Position | Prefill | "new" | null>(prefill);
  const targets = useMemo(() => positions.map((p) => ({ kind: p.kind, symbol: p.symbol })), [positions]);
  const { live, rates, loading, updated } = useLivePrices(targets, 120);
  const { rows, totals } = useMemo(() => valuePositions(positions, live, rates), [positions, live, rates]);

  const save = (p: Position) => {
    const cur = portfolioStore.read();
    portfolioStore.write(cur.some((x) => x.id === p.id) ? cur.map((x) => (x.id === p.id ? p : x)) : [...cur, p]);
    setEditing(null);
    if (prefill && typeof window !== "undefined") window.history.replaceState(null, "", "/portefeuille");
  };
  const remove = (id: string) => {
    const p = positions.find((x) => x.id === id);
    if (p && window.confirm(`Supprimer la ligne « ${p.name} » ?`)) portfolioStore.write(portfolioStore.read().filter((x) => x.id !== id));
  };

  const empty = positions.length === 0;

  return (
    <div className="space-y-12">
      {editing ? (
        <PositionForm
          key={typeof editing === "string" ? "new" : "id" in editing ? editing.id : editing.symbol}
          initial={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => setEditing("new")} className="h-10 rounded-md bg-ink px-4 text-sm text-bg">
            + Ajouter un achat
          </button>
          {!empty && (
            <p className="ticker">
              {loading ? "Mise à jour des cours…" : updated ? `Cours mis à jour à ${new Date(updated).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
            </p>
          )}
        </div>
      )}

      {empty && !editing && (
        <div className="border border-dashed border-line-strong rounded-lg py-14 px-6 text-center">
          <p className="font-serif text-xl">Votre portefeuille est vide</p>
          <p className="text-ink-2 mt-2 max-w-md mx-auto text-sm leading-relaxed">
            Ajoutez vos achats (actions, ETF, cryptos…) avec leur quantité et leur prix. Boussole calcule la valeur actuelle, la
            plus-value et la répartition. Vous pouvez aussi cliquer sur « + Portefeuille » depuis la fiche d’un actif.
          </p>
        </div>
      )}

      {!empty && (
        <>
          <section className="grid gap-px rounded-lg border border-line bg-line overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Valeur actuelle" value={fmtEur(totals.valueEur)} sub={totals.missing ? `${totals.missing} cours indisponible(s)` : `${rows.length} ligne${rows.length > 1 ? "s" : ""}`} />
            <Tile label="Montant investi" value={fmtEur(totals.costEur)} sub="frais compris" />
            <Tile
              label="Plus-value latente"
              value={<span className={trendClass(totals.gainEur)}>{signedEur(totals.gainEur)}</span>}
              sub={<span className={trendClass(totals.gainPct)}>{fmtPct(totals.gainPct)}</span>}
            />
            <Tile
              label="Variation du jour"
              value={<span className={trendClass(totals.dayGainEur)}>{signedEur(totals.dayGainEur)}</span>}
              sub={<span className={trendClass(totals.dayPct)}>{fmtPct(totals.dayPct)}</span>}
            />
          </section>

          <section>
            <SectionTitle>Positions</SectionTitle>
            <PositionsTable rows={rows} onEdit={(p) => setEditing(p)} onRemove={remove} />
            <p className="ticker mt-3 leading-relaxed">
              Valeurs converties en euros au taux du jour. La plus-value en % est calculée dans la devise de l’actif (hors effet de change) ;
              la plus-value en euros applique le taux du jour au prix d’achat. Hors dividendes perçus.
            </p>
          </section>

          <section className="grid gap-10 md:grid-cols-2 xl:grid-cols-3">
            <Allocation title="Par classe d’actifs" items={breakdown(rows, (r) => r.assetClass)} />
            <Allocation title="Par zone" items={breakdown(rows, (r) => r.region)} />
            <Allocation title="Par devise" items={breakdown(rows, (r) => (r.kind === "coin" ? "Crypto (en €)" : r.currency === "GBp" ? "GBP" : r.currency))} />
          </section>

          <Insights rows={rows} />
        </>
      )}
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="bg-surface px-5 py-4">
      <p className="eyebrow">{label}</p>
      <p className="num text-2xl font-semibold mt-1.5 tracking-tight">{value}</p>
      {sub && <p className="num text-sm text-ink-3 mt-0.5">{sub}</p>}
    </div>
  );
}

function PositionsTable({ rows, onEdit, onRemove }: { rows: PositionView[]; onEdit: (p: Position) => void; onRemove: (id: string) => void }) {
  const sorted = [...rows].sort((a, b) => (b.valueEur ?? -1) - (a.valueEur ?? -1));
  return (
    <div className="scroll-x">
      <table className="data-table text-sm">
        <thead>
          <tr>
            <th>Actif</th>
            <th className="hidden md:table-cell">Quantité</th>
            <th className="hidden lg:table-cell">Prix d’achat</th>
            <th className="hidden sm:table-cell">Cours</th>
            <th className="hidden sm:table-cell">Jour</th>
            <th>Valeur</th>
            <th>Plus-value</th>
            <th className="hidden md:table-cell">Poids</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id}>
              <td className="max-w-[15rem]">
                <Link href={r.kind === "coin" ? `/crypto/${r.symbol}` : `/actif/${encodeURIComponent(r.symbol)}`} className="block hover:text-accent">
                  <span className="block truncate font-medium">{r.name}</span>
                  <span className="ticker">
                    {r.kind === "coin" ? "Crypto" : r.symbol} · achat {fmtDate(r.date, { day: "numeric", month: "short", year: "2-digit" })}
                  </span>
                </Link>
              </td>
              <td className="hidden md:table-cell">{fmtNumber(r.quantity, r.quantity % 1 ? Math.min(6, String(r.quantity).split(".")[1]?.length ?? 2) : 0)}</td>
              <td className="hidden lg:table-cell text-ink-2">{fmtPrice(r.buyPrice, r.currency)}</td>
              <td className="hidden sm:table-cell">{fmtPrice(r.price, r.kind === "coin" ? "EUR" : r.currency)}</td>
              <td className="hidden sm:table-cell">
                <Change value={r.changePct} />
              </td>
              <td>{fmtEur(r.valueEur, 0)}</td>
              <td>
                <span className={`block ${trendClass(r.gainEur)}`}>{signedEur(r.gainEur)}</span>
                <span className={`block text-xs ${trendClass(r.gainPct)}`}>{fmtPct(r.gainPct, 1)}</span>
              </td>
              <td className="hidden md:table-cell text-ink-2">{r.weight != null ? `${fmtNumber(r.weight * 100, 1)} %` : "—"}</td>
              <td className="whitespace-nowrap">
                <button type="button" onClick={() => onEdit(r)} className="text-ink-3 hover:text-ink px-1.5" aria-label={`Modifier ${r.name}`} title="Modifier">
                  ✎
                </button>
                <button type="button" onClick={() => onRemove(r.id)} className="text-ink-3 hover:text-down px-1.5" aria-label={`Supprimer ${r.name}`} title="Supprimer">
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Répartition : barres horizontales triées, une seule couleur, valeurs écrites. */
function Allocation({ title, items }: { title: string; items: { label: string; value: number; weight: number }[] }) {
  return (
    <div>
      <h3 className="eyebrow pb-2 border-b border-line">{title}</h3>
      <ul className="mt-2 space-y-2.5">
        {items.map((i) => (
          <li key={i.label} className="text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate">{i.label}</span>
              <span className="num text-ink-2 shrink-0">
                {fmtNumber(i.weight * 100, 1)} % <span className="text-ink-3 text-xs">· {fmtEur(i.value, 0)}</span>
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-surface-2" aria-hidden>
              <div className="h-2 rounded-full" style={{ width: `${Math.max(i.weight * 100, 1)}%`, background: "var(--chart-line)" }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Constats factuels sur la diversification (pas des recommandations). */
function Insights({ rows }: { rows: PositionView[] }) {
  const notes: string[] = [];
  const valued = rows.filter((r) => r.weight != null);
  const top = [...valued].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))[0];
  if (top && valued.length > 1 && (top.weight ?? 0) > 0.25)
    notes.push(`${top.name} pèse ${fmtNumber((top.weight ?? 0) * 100, 0)} % du portefeuille : sa variation pèse fortement sur l’ensemble.`);
  const crypto = breakdown(rows, (r) => r.assetClass).find((b) => b.label === "Crypto");
  if (crypto && crypto.weight > 0.2) notes.push(`Les cryptomonnaies représentent ${fmtNumber(crypto.weight * 100, 0)} % : leur volatilité est souvent 3 à 4 fois celle des actions.`);
  const region = breakdown(rows, (r) => r.region)[0];
  if (region && valued.length > 2 && region.weight > 0.7 && region.label !== "Monde")
    notes.push(`${fmtNumber(region.weight * 100, 0)} % de la valeur est concentrée sur une seule zone (${region.label}).`);
  const nonEur = valued.filter((r) => r.kind !== "coin" && r.currency !== "EUR").reduce((s, r) => s + (r.weight ?? 0), 0);
  if (nonEur > 0.3) notes.push(`${fmtNumber(nonEur * 100, 0)} % des actifs sont cotés hors euro : les variations de change s’ajoutent à celles des cours.`);
  const etfs = breakdown(rows, (r) => r.assetClass).find((b) => b.label === "ETF");
  if (!etfs && valued.length > 0 && valued.length < 5)
    notes.push("Peu de lignes et aucun ETF : chaque ligne dépend d’une seule entreprise, alors qu’un ETF large (voir la page ETF) en regroupe des centaines.");
  if (!notes.length) return null;
  return (
    <section>
      <SectionTitle>Points d’attention</SectionTitle>
      <ul className="mt-3 space-y-2 text-sm text-ink-2 leading-relaxed max-w-3xl">
        {notes.map((n) => (
          <li key={n} className="flex gap-3">
            <span className="text-ink-3" aria-hidden>
              —
            </span>
            {n}
          </li>
        ))}
      </ul>
      <p className="ticker mt-3">Constats automatiques sur la répartition, pas des conseils en investissement.</p>
    </section>
  );
}

// ---------- Formulaire ----------

interface Draft {
  kind: "asset" | "coin";
  symbol: string;
  name: string;
  currency: string;
  price: number | null;
}

function PositionForm({ initial, onSave, onCancel }: { initial: Position | Prefill | null; onSave: (p: Position) => void; onCancel: () => void }) {
  const existing = initial && "id" in initial ? initial : null;
  const [asset, setAsset] = useState<Draft | null>(
    initial
      ? {
          kind: initial.kind,
          symbol: initial.symbol,
          name: initial.name,
          currency: (existing ? existing.currency : (initial as Prefill).currency) ?? (initial.kind === "coin" ? "EUR" : "EUR"),
          price: existing ? null : (initial as Prefill).price,
        }
      : null,
  );
  const [qty, setQty] = useState(existing ? String(existing.quantity).replace(".", ",") : "");
  const [price, setPrice] = useState(
    existing ? String(existing.buyPrice).replace(".", ",") : initial && "price" in initial && initial.price != null ? String(initial.price).replace(".", ",") : "",
  );
  const [date, setDate] = useState(existing?.date ?? todayIso());
  const [fees, setFees] = useState(existing?.fees ? String(existing.fees).replace(".", ",") : "");
  const [lookup, setLookup] = useState(false);

  const pick = async (h: PickedHit) => {
    const coinId = coinIdOf(h);
    setLookup(true);
    try {
      if (coinId) {
        const j = (await fetch(`/api/coins?ids=${encodeURIComponent(coinId)}`).then((r) => r.json())) as { coins: { price: number }[] };
        const p = j.coins[0]?.price ?? null;
        setAsset({ kind: "coin", symbol: coinId, name: h.name, currency: "EUR", price: p });
        if (p != null && !price) setPrice(String(p).replace(".", ","));
      } else {
        const j = (await fetch(`/api/quotes?spark=0&symbols=${encodeURIComponent(h.symbol)}`).then((r) => r.json())) as {
          quotes: { price: number | null; currency: string | null; name: string }[];
        };
        const q = j.quotes[0];
        setAsset({ kind: "asset", symbol: h.symbol, name: q?.name ?? h.name, currency: q?.currency ?? "EUR", price: q?.price ?? null });
        if (q?.price != null && !price) setPrice(String(q.price).replace(".", ","));
      }
    } finally {
      setLookup(false);
    }
  };

  const q = parseNum(qty);
  const bp = parseNum(price);
  const fe = fees.trim() ? parseNum(fees) : 0;
  const valid = asset && q > 0 && bp >= 0 && Number.isFinite(fe) && fe >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

  return (
    <section className="rounded-lg border border-line-strong bg-surface p-5 sm:p-6 max-w-3xl">
      <h2 className="font-serif text-xl font-semibold">{existing ? "Modifier la ligne" : "Ajouter un achat"}</h2>
      <form
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid || !asset) return;
          onSave({
            id: existing?.id ?? newId(),
            kind: asset.kind,
            symbol: asset.symbol,
            name: asset.name,
            quantity: q,
            buyPrice: bp,
            currency: asset.currency,
            date,
            fees: fe || undefined,
          });
        }}
      >
        <div className="sm:col-span-2">
          <span className="block text-sm text-ink-2 mb-1">Actif</span>
          {asset ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-bg px-3 py-2 text-sm">
              <span>
                <span className="font-medium">{asset.name}</span>
                <span className="ticker ml-2">
                  {asset.kind === "coin" ? "Crypto" : asset.symbol} · {asset.currency}
                  {asset.price != null && ` · cours ${fmtPrice(asset.price, asset.currency)}`}
                </span>
              </span>
              {!existing && (
                <button type="button" className="link text-xs" onClick={() => setAsset(null)}>
                  Changer
                </button>
              )}
            </div>
          ) : (
            <SymbolPicker onPick={pick} placeholder="Rechercher : LVMH, CW8, bitcoin…" />
          )}
          {lookup && <p className="ticker mt-1">Recherche du cours…</p>}
        </div>
        <Field label="Quantité" value={qty} onChange={setQty} placeholder="10" />
        <Field label={`Prix d’achat unitaire${asset ? ` (${asset.currency})` : ""}`} value={price} onChange={setPrice} placeholder="0,00" />
        <label className="block text-sm">
          <span className="text-ink-2">Date d’achat</span>
          <input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-bg px-3" />
        </label>
        <Field label="Frais (facultatif)" value={fees} onChange={setFees} placeholder="0" />
        {asset && q > 0 && bp >= 0 && (
          <p className="sm:col-span-2 text-sm text-ink-2">
            Montant investi : <span className="num text-ink">{fmtPrice(q * bp + (Number.isFinite(fe) ? fe : 0), asset.currency)}</span>
          </p>
        )}
        <div className="sm:col-span-2 flex gap-3">
          <button type="submit" disabled={!valid} className="h-10 rounded-md bg-ink px-4 text-sm text-bg disabled:opacity-40">
            {existing ? "Enregistrer" : "Ajouter au portefeuille"}
          </button>
          <button type="button" onClick={onCancel} className="h-10 rounded-md border border-line-strong px-4 text-sm text-ink-2 hover:text-ink">
            Annuler
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block text-sm">
      <span className="text-ink-2">{label}</span>
      <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 h-10 w-full rounded-md border border-line bg-bg px-3 num" />
    </label>
  );
}
