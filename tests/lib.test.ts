import { describe, expect, it } from "vitest";
import { summarizeDividends, frequencyLabel } from "@/lib/dividends";
import { squarify } from "@/lib/treemap";
import { breakdown, eur, isPosition, valuePositions, type Position } from "@/lib/portfolio";
import { isAlert, isTriggered } from "@/lib/alerts";
import { parseEcbCsv, splitCsvLine } from "@/lib/ecb";
import { fmtCompact, fmtPct, fmtPrice } from "@/lib/format";
import { toEur } from "@/lib/fx";
import { ETFS, STOCKS, etfDef } from "@/lib/universe";
import { MACRO_EVENTS } from "@/lib/calendar";

const ts = (iso: string) => Date.parse(iso) / 1000;

describe("dividendes", () => {
  const divs = [2019, 2020, 2021, 2022, 2023, 2024, 2025].flatMap((y, i) => [
    { t: ts(`${y}-03-15`), amount: 0.5 + i * 0.05 },
    { t: ts(`${y}-09-15`), amount: 0.5 + i * 0.05 },
  ]);
  const s = summarizeDividends([...divs, { t: ts("2026-03-15"), amount: 0.9 }], Date.parse("2026-11-13"))!;

  it("totaux par année et année en cours marquée comme partielle", () => {
    expect(s.years.find((y) => y.year === 2019)!.total).toBeCloseTo(1);
    expect(s.years.at(-1)).toMatchObject({ year: 2026, partial: true, payments: 1 });
  });
  it("croissance sur 5 ans, série sans baisse, fréquence", () => {
    // 2020 : 1,10 → 2025 : 1,60
    expect(s.cagr5).toBeCloseTo(Math.pow(1.6 / 1.1, 1 / 5) - 1);
    expect(s.streak).toBe(6);
    expect(s.frequency).toBe(2);
    expect(frequencyLabel(2)).toBe("semestriel");
  });
  it("une baisse interrompt la série ; une année sans versement compte comme zéro", () => {
    const cut = summarizeDividends(
      [
        { t: ts("2021-05-01"), amount: 2 },
        { t: ts("2022-05-01"), amount: 1 },
        { t: ts("2024-05-01"), amount: 1.2 },
        { t: ts("2025-05-01"), amount: 1.3 },
      ],
      Date.parse("2026-01-10"),
    )!;
    expect(cut.years.find((y) => y.year === 2023)!.total).toBe(0);
    expect(cut.streak).toBe(2);
  });
  it("aucun dividende", () => {
    expect(summarizeDividends([])).toBeNull();
  });
});

describe("carte proportionnelle", () => {
  const items = [6, 6, 4, 3, 2, 2, 1].map((value, i) => ({ id: i, value }));
  const box = { x: 0, y: 0, w: 600, h: 400 };
  const rects = squarify(items, box);

  it("aires proportionnelles aux valeurs et contenues dans la zone", () => {
    const total = 24;
    for (const r of rects) {
      expect(r.w * r.h).toBeCloseTo((r.value / total) * box.w * box.h, 6);
      expect(r.x).toBeGreaterThanOrEqual(-1e-9);
      expect(r.y).toBeGreaterThanOrEqual(-1e-9);
      expect(r.x + r.w).toBeLessThanOrEqual(box.w + 1e-6);
      expect(r.y + r.h).toBeLessThanOrEqual(box.h + 1e-6);
    }
  });
  it("aucun chevauchement", () => {
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        expect(ox > 1e-6 && oy > 1e-6).toBe(false);
      }
  });
  it("ignore les valeurs nulles", () => {
    expect(squarify([{ value: 0 }, { value: 5 }], box)).toHaveLength(1);
  });
});

describe("portefeuille", () => {
  const rates = { EUR: 1, USD: 1.1, GBP: 0.85 };
  const positions: Position[] = [
    { id: "a", kind: "asset", symbol: "MC.PA", name: "LVMH", quantity: 2, buyPrice: 500, currency: "EUR", date: "2024-01-02", fees: 10 },
    { id: "b", kind: "asset", symbol: "AAPL", name: "Apple", quantity: 10, buyPrice: 110, currency: "USD", date: "2024-01-02" },
    { id: "c", kind: "asset", symbol: "ULVR.L", name: "Unilever", quantity: 100, buyPrice: 4000, currency: "GBp", date: "2024-01-02" },
    { id: "d", kind: "coin", symbol: "bitcoin", name: "Bitcoin", quantity: 0.01, buyPrice: 50000, currency: "EUR", date: "2024-01-02" },
  ];
  const live = {
    "asset:MC.PA": { price: 600, currency: "EUR", changePct: 0, assetClass: "Actions", region: "Europe" },
    "asset:AAPL": { price: 220, currency: "USD", changePct: 10, assetClass: "Actions", region: "États-Unis" },
    "asset:ULVR.L": { price: 4250, currency: "GBp", changePct: 0, assetClass: "Actions", region: "Europe" },
    // bitcoin sans cours : doit être compté comme manquant
  };
  const { rows, totals } = valuePositions(positions, live, rates);

  it("conversion en euros, y compris les pence britanniques", () => {
    expect(eur(110, "USD", rates)).toBeCloseTo(100);
    expect(eur(4250, "GBp", rates)).toBeCloseTo(42.5 / 0.85);
    expect(eur(10, "XXX", rates)).toBeNull();
    expect(toEur(1000, "GBp", rates, true)).toBeCloseTo(1000 / 0.85);
  });
  it("valeur, coût (frais compris) et plus-value", () => {
    const lv = rows.find((r) => r.id === "a")!;
    expect(lv.valueEur).toBeCloseTo(1200);
    expect(lv.costEur).toBeCloseTo(1010);
    expect(lv.gainEur).toBeCloseTo(190);
    expect(lv.gainPct).toBeCloseTo((1200 / 1010 - 1) * 100);
    expect(rows.find((r) => r.id === "b")!.gainPct).toBeCloseTo(100);
  });
  it("totaux, variation du jour et lignes sans cours", () => {
    expect(totals.missing).toBe(1);
    expect(totals.valueEur).toBeCloseTo(1200 + 2000 + 4250 / 0.85);
    // Apple : +10 % sur la journée → prix de la veille 200 $, soit +20 $ × 10 = 200 $ ≈ 181,82 €
    expect(totals.dayGainEur).toBeCloseTo(200 / 1.1);
    const weights = rows.filter((r) => r.weight != null).reduce((s, r) => s + (r.weight ?? 0), 0);
    expect(weights).toBeCloseTo(1);
  });
  it("répartition triée", () => {
    const b = breakdown(rows, (r) => r.region);
    expect(b[0].label).toBe("Europe");
    expect(b.reduce((s, x) => s + x.weight, 0)).toBeCloseTo(1);
  });
  it("validation des positions importées", () => {
    expect(isPosition(positions[0])).toBe(true);
    expect(isPosition({ ...positions[0], quantity: -1 })).toBe(false);
    expect(isPosition({ kind: "asset" })).toBe(false);
  });
});

describe("alertes", () => {
  it("déclenchement au-dessus / en dessous du seuil", () => {
    expect(isTriggered({ direction: "above", threshold: 100 }, 100)).toBe(true);
    expect(isTriggered({ direction: "above", threshold: 100 }, 99.9)).toBe(false);
    expect(isTriggered({ direction: "below", threshold: 100 }, 99)).toBe(true);
    expect(isTriggered({ direction: "below", threshold: 100 }, null)).toBe(false);
  });
  it("validation", () => {
    expect(isAlert({ id: "1", kind: "asset", symbol: "X", direction: "above", threshold: 1 })).toBe(true);
    expect(isAlert({ id: "1", kind: "asset", symbol: "X", direction: "sideways", threshold: 1 })).toBe(false);
  });
});

describe("données BCE", () => {
  it("lecture du CSV (mensuel, trimestriel, journalier)", () => {
    const csv = "KEY,FREQ,TIME_PERIOD,OBS_VALUE,OBS_STATUS\nA,M,2026-09,2.1,A\nA,M,2026-08,2.0,A\nA,M,2026-10,,A\n";
    const pts = parseEcbCsv(csv);
    expect(pts.map((p) => p.period)).toEqual(["2026-08", "2026-09"]);
    expect(pts[1].v).toBe(2.1);
    expect(parseEcbCsv("KEY,TIME_PERIOD,OBS_VALUE\nB,2026-Q2,1.3")[0].t).toBe(Date.UTC(2026, 3, 1));
    expect(parseEcbCsv("pas de données")).toEqual([]);
  });
  it("champs entre guillemets contenant des virgules (commentaires de la BCE)", () => {
    const csv = 'KEY,TIME_PERIOD,OBS_VALUE,OBS_COM,TITLE\nA,2026-01,2.1,"Changement, méthode",x\nA,2026-02,2.3,,"Zone euro, taux annuel"\n';
    expect(parseEcbCsv(csv).map((p) => p.v)).toEqual([2.1, 2.3]);
    expect(splitCsvLine('a,"b, c",d')).toEqual(["a", "b, c", "d"]);
  });
});

describe("formats français", () => {
  it("pourcentages signés, montants et grandes valeurs", () => {
    expect(fmtPct(1.234)).toBe("+1,23 %");
    expect(fmtPct(-0.5, 1)).toBe("−0,5 %");
    expect(fmtPrice(1234.5, "EUR")).toMatch(/^1\s234,50 €$/);
    expect(fmtCompact(2.5e12, "EUR")).toMatch(/^2\s500 Md €$/);
    expect(fmtPct(null)).toBe("—");
  });
});

describe("univers", () => {
  it("pas de symbole en double", () => {
    const all = [...STOCKS.map((s) => s.symbol), ...ETFS.map((e) => e.symbol)];
    expect(new Set(all).size).toBe(all.length);
  });
  it("ETF : frais plausibles et au moins un fonds PEA par grande zone", () => {
    for (const e of ETFS) {
      if (e.ter == null) continue;
      expect(e.ter).toBeGreaterThan(0);
      expect(e.ter).toBeLessThan(1);
    }
    for (const cat of ["Monde", "États-Unis", "Europe", "Émergents"]) expect(ETFS.some((e) => e.pea && e.category === cat)).toBe(true);
    expect(etfDef("CW8.PA")?.pea).toBe(true);
  });
  it("calendrier des banques centrales trié par banque et sans doublon", () => {
    const keys = MACRO_EVENTS.map((e) => e.bank + e.date);
    expect(new Set(keys).size).toBe(keys.length);
    for (const e of MACRO_EVENTS) expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
