import { describe, expect, it } from "vitest";
import { maxDrawdown, rsi, sma } from "@/lib/indicators";
import { analyze, verdictFor } from "@/lib/analysis";
import { backtestScore, mergeBacktests, technicalScores } from "@/lib/backtest";

/** Série synthétique reproductible : tendance + oscillations + bruit pseudo-aléatoire. */
function series(n: number, drift = 0.0004, seed = 7): { t: number; c: number }[] {
  let x = seed;
  const rnd = () => {
    x = (x * 16807) % 2147483647;
    return x / 2147483647 - 0.5;
  };
  const out: { t: number; c: number }[] = [];
  let p = 100;
  for (let i = 0; i < n; i++) {
    p *= 1 + drift + 0.004 * Math.sin(i / 37) + rnd() * 0.02;
    out.push({ t: 1_500_000_000 + i * 86400, c: p });
  }
  return out;
}

describe("indicateurs", () => {
  it("moyenne mobile simple", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });
  it("RSI borné entre 0 et 100, 100 si uniquement des hausses", () => {
    const up = Array.from({ length: 30 }, (_, i) => 10 + i);
    const r = rsi(up, 14);
    expect(r[29]).toBe(100);
    const mixed = series(200).map((d) => d.c);
    for (const v of rsi(mixed, 14)) {
      if (v == null) continue;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
  it("pire baisse depuis un sommet", () => {
    expect(maxDrawdown([100, 120, 90, 130, 117])).toBeCloseTo(-0.25);
    expect(maxDrawdown([1, 2, 3])).toBe(0);
  });
});

describe("score de tendance", () => {
  it("verdicts aux seuils", () => {
    expect(verdictFor(65).verdict).toBe("Haussière");
    expect(verdictFor(55).verdict).toBe("Plutôt haussière");
    expect(verdictFor(50).verdict).toBe("Neutre");
    expect(verdictFor(40).verdict).toBe("Plutôt baissière");
    expect(verdictFor(20).verdict).toBe("Baissière");
  });

  it("le test rétrospectif utilise exactement les mêmes règles que le score affiché", () => {
    // Sans saisonnalité ni fondamentaux, analyze() ne contient que les signaux techniques
    for (const drift of [0.001, 0, -0.001]) {
      const daily = series(900, drift);
      const a = analyze({ kind: "index", daily });
      const scores = technicalScores(
        daily.map((d) => d.c),
        "index",
      );
      expect(a).not.toBeNull();
      expect(scores[scores.length - 1]).toBe(a!.score);
    }
  });

  it("idem pour une crypto (seuils élargis, 365 jours par an)", () => {
    const daily = series(1200, 0.0008, 11);
    const a = analyze({ kind: "crypto", daily });
    const scores = technicalScores(
      daily.map((d) => d.c),
      "crypto",
    );
    expect(scores[scores.length - 1]).toBe(a!.score);
  });

  it("une tendance haussière régulière donne un score haussier", () => {
    const daily = Array.from({ length: 400 }, (_, i) => ({ t: i * 86400, c: 100 * Math.pow(1.001, i) * (1 + 0.01 * Math.sin(i / 5)) }));
    expect(analyze({ kind: "index", daily })!.score).toBeGreaterThanOrEqual(55);
  });

  it("projection : fourchettes ordonnées", () => {
    const a = analyze({ kind: "stock", daily: series(600) })!;
    for (const r of a.projection) {
      expect(r.p5).toBeLessThan(r.p25);
      expect(r.p25).toBeLessThan(r.p50);
      expect(r.p50).toBeLessThan(r.p75);
      expect(r.p75).toBeLessThan(r.p95);
    }
  });
});

describe("test rétrospectif", () => {
  it("compte des observations cohérent et n'utilise pas l'avenir", () => {
    const daily = series(2000);
    const b = backtestScore(daily, "index")!;
    expect(b).not.toBeNull();
    expect(b.all.n).toBe(b.bullish.n + b.neutral.n + b.bearish.n);
    expect(b.all.upRate).toBeGreaterThanOrEqual(0);
    expect(b.all.upRate).toBeLessThanOrEqual(1);
    // Le score à une date ne dépend pas des cours postérieurs
    const closes = daily.map((d) => d.c);
    const full = technicalScores(closes, "index");
    const cut = technicalScores(closes.slice(0, 1000), "index");
    expect(cut[999]).toBe(full[999]);
  });

  it("historique trop court : pas de résultat", () => {
    expect(backtestScore(series(300), "index")).toBeNull();
  });

  it("fusion pondérée par le nombre d'observations", () => {
    const a = backtestScore(series(2000, 0.0005, 3), "index")!;
    const b = backtestScore(series(1500, -0.0002, 5), "index")!;
    const m = mergeBacktests([a, b]);
    expect(m.all.n).toBe(a.all.n + b.all.n);
    const expected = (a.all.upRate! * a.all.n + b.all.upRate! * b.all.n) / (a.all.n + b.all.n);
    expect(m.all.upRate).toBeCloseTo(expected);
  });
});
