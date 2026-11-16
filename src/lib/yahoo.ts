import "server-only";
import YahooFinance from "yahoo-finance2";
import { unstable_cache } from "next/cache";
import { knownName } from "./universe";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });
const NO_VALIDATE = { validateResult: false } as const;

export interface Quote {
  symbol: string;
  name: string;
  quoteType: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  prevClose: number | null;
  currency: string | null;
  marketState: string | null;
  exchange: string | null;
  time: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  open: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  volume: number | null;
  avgVolume: number | null;
  marketCap: number | null;
  pe: number | null;
  forwardPe: number | null;
  priceToBook: number | null;
  dividendYield: number | null;
  fiftyDayAvg: number | null;
  twoHundredDayAvg: number | null;
  yearChangePct: number | null;
  analystRating: string | null;
  earningsDate: number | null;
  earningsEstimate: boolean;
  /** Frais courants annuels (ETF), en % */
  ter: number | null;
  ytdReturn: number | null;
  /** Dividende annuel par action (prévisionnel) */
  dividendRate: number | null;
  /** Date de versement du prochain dividende (si connue) */
  dividendDate: number | null;
}

export interface Bar {
  t: number; // secondes UNIX
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const ms = (v: unknown): number | null => {
  if (v == null) return null;
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  return null;
};

function cleanName(raw: string | undefined, symbol: string): string {
  const known = knownName(symbol);
  if (known) return known;
  if (!raw) return symbol;
  return raw.replace(/\s{2,}.*$/, "").trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeQuote(q: any): Quote {
  const fiftyTwoChange = num(q.fiftyTwoWeekChangePercent);
  return {
    symbol: q.symbol,
    name: cleanName(q.longName ?? q.shortName, q.symbol),
    quoteType: q.quoteType ?? "EQUITY",
    price: num(q.regularMarketPrice),
    change: num(q.regularMarketChange),
    changePct: num(q.regularMarketChangePercent),
    prevClose: num(q.regularMarketPreviousClose),
    currency: q.currency ?? null,
    marketState: q.marketState ?? null,
    exchange: q.fullExchangeName ?? q.exchange ?? null,
    time: ms(q.regularMarketTime),
    dayHigh: num(q.regularMarketDayHigh),
    dayLow: num(q.regularMarketDayLow),
    open: num(q.regularMarketOpen),
    yearHigh: num(q.fiftyTwoWeekHigh),
    yearLow: num(q.fiftyTwoWeekLow),
    volume: num(q.regularMarketVolume),
    avgVolume: num(q.averageDailyVolume3Month),
    marketCap: num(q.marketCap),
    pe: num(q.trailingPE),
    forwardPe: num(q.forwardPE),
    priceToBook: num(q.priceToBook),
    dividendYield: num(q.dividendYield),
    fiftyDayAvg: num(q.fiftyDayAverage),
    twoHundredDayAvg: num(q.twoHundredDayAverage),
    yearChangePct: fiftyTwoChange,
    analystRating: q.averageAnalystRating ?? null,
    earningsDate: ms(q.earningsTimestampStart ?? q.earningsTimestamp),
    earningsEstimate: Boolean(q.isEarningsDateEstimate),
    ter: num(q.netExpenseRatio ?? q.annualReportExpenseRatio),
    ytdReturn: num(q.ytdReturn),
    dividendRate: num(q.dividendRate ?? q.trailingAnnualDividendRate),
    dividendDate: ms(q.dividendDate),
  };
}

async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  const out: Quote[] = [];
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += 40) chunks.push(symbols.slice(i, i + 40));
  const results = await Promise.allSettled(
    chunks.map((c) => yf.quote(c, { return: "array" }, NO_VALIDATE)),
  );
  for (const r of results) {
    if (r.status === "fulfilled") for (const q of r.value as unknown[]) out.push(normalizeQuote(q));
    else console.error("[yahoo] quote", r.reason?.message ?? r.reason);
  }
  // Conserver l'ordre demandé
  const map = new Map(out.map((q) => [q.symbol, q]));
  return symbols.map((s) => map.get(s)).filter((q): q is Quote => Boolean(q));
}

const cachedQuotes = unstable_cache(fetchQuotes, ["yf-quotes-v2"], { revalidate: 60 });

export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];
  try {
    return await cachedQuotes([...symbols]);
  } catch (e) {
    console.error("[yahoo] getQuotes", e);
    return [];
  }
}

export async function getQuote(symbol: string): Promise<Quote | null> {
  const [q] = await getQuotes([symbol]);
  return q ?? null;
}

// ---------- Historique ----------

export type RangeKey = "1J" | "5J" | "1M" | "6M" | "1A" | "5A" | "MAX";

const DAY = 86400_000;

function rangeParams(range: RangeKey): { period1: Date; interval: "5m" | "15m" | "1h" | "1d" | "1wk" | "1mo" } {
  const now = Date.now();
  switch (range) {
    case "1J":
      return { period1: new Date(now - 5 * DAY), interval: "5m" };
    case "5J":
      return { period1: new Date(now - 8 * DAY), interval: "15m" };
    case "1M":
      return { period1: new Date(now - 31 * DAY), interval: "1h" };
    case "6M":
      return { period1: new Date(now - 183 * DAY), interval: "1d" };
    case "1A":
      return { period1: new Date(now - 366 * DAY), interval: "1d" };
    case "5A":
      return { period1: new Date(now - 5 * 366 * DAY), interval: "1wk" };
    case "MAX":
      return { period1: new Date("1970-01-02"), interval: "1mo" };
  }
}

interface ChartRes {
  quotes?: unknown[];
  meta?: { gmtoffset?: number; currency?: string };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBars(quotes: any[]): Bar[] {
  const bars: Bar[] = [];
  for (const q of quotes) {
    const c = num(q.close);
    if (c == null) continue;
    const t = ms(q.date);
    if (t == null) continue;
    bars.push({
      t: Math.floor(t / 1000),
      o: num(q.open) ?? c,
      h: num(q.high) ?? c,
      l: num(q.low) ?? c,
      c,
      v: num(q.volume) ?? 0,
    });
  }
  return bars;
}

async function fetchChart(symbol: string, range: RangeKey): Promise<{ bars: Bar[]; currency: string | null; gmtoffset: number }> {
  const p = rangeParams(range);
  const res = (await yf.chart(symbol, { period1: p.period1, interval: p.interval }, NO_VALIDATE)) as ChartRes;
  let bars = toBars(res.quotes ?? []);
  const gmtoffset = num(res.meta?.gmtoffset) ?? 0;
  if (range === "1J" && bars.length) {
    // Ne garder que la dernière séance
    const lastDay = new Date((bars[bars.length - 1].t + gmtoffset) * 1000).toISOString().slice(0, 10);
    bars = bars.filter((b) => new Date((b.t + gmtoffset) * 1000).toISOString().slice(0, 10) === lastDay);
  }
  if (range === "5J" && bars.length) {
    const days = Array.from(new Set(bars.map((b) => new Date((b.t + gmtoffset) * 1000).toISOString().slice(0, 10))));
    const keep = new Set(days.slice(-5));
    bars = bars.filter((b) => keep.has(new Date((b.t + gmtoffset) * 1000).toISOString().slice(0, 10)));
  }
  return { bars, currency: res.meta?.currency ?? null, gmtoffset };
}

const cachedChart = unstable_cache(fetchChart, ["yf-chart-v1"], { revalidate: 300 });

export async function getChart(symbol: string, range: RangeKey) {
  try {
    return await cachedChart(symbol, range);
  } catch (e) {
    console.error("[yahoo] chart", symbol, range, (e as Error).message);
    return { bars: [] as Bar[], currency: null, gmtoffset: 0 };
  }
}

async function fetchDaily(symbol: string, years: number): Promise<Bar[]> {
  const res = (await yf.chart(
    symbol,
    { period1: new Date(Date.now() - years * 366 * DAY), interval: "1d" },
    NO_VALIDATE,
  )) as ChartRes;
  return toBars(res.quotes ?? []);
}
const cachedDaily = unstable_cache(fetchDaily, ["yf-daily-v1"], { revalidate: 1800 });

/** Historique quotidien pour les indicateurs (défaut : 3 ans). */
export async function getDaily(symbol: string, years = 3): Promise<Bar[]> {
  try {
    return await cachedDaily(symbol, years);
  } catch (e) {
    console.error("[yahoo] daily", symbol, (e as Error).message);
    return [];
  }
}

async function fetchMonthly(symbol: string): Promise<Bar[]> {
  const res = (await yf.chart(symbol, { period1: new Date("1990-01-01"), interval: "1mo" }, NO_VALIDATE)) as ChartRes;
  return toBars(res.quotes ?? []);
}
const cachedMonthly = unstable_cache(fetchMonthly, ["yf-monthly-v1"], { revalidate: 43200 });

/** Historique mensuel long (saisonnalité). */
export async function getMonthly(symbol: string): Promise<Bar[]> {
  try {
    return await cachedMonthly(symbol);
  } catch (e) {
    console.error("[yahoo] monthly", symbol, (e as Error).message);
    return [];
  }
}

// ---------- Dividendes ----------

export interface Dividend {
  t: number; // secondes UNIX (date de détachement)
  amount: number;
}

interface DivChartRes {
  events?: { dividends?: { amount?: unknown; date?: unknown }[] | Record<string, { amount?: unknown; date?: unknown }> };
}

async function fetchDividends(symbol: string): Promise<Dividend[]> {
  const res = (await yf.chart(symbol, { period1: new Date("2000-01-01"), interval: "1mo", events: "div" }, NO_VALIDATE)) as DivChartRes;
  const raw = res.events?.dividends ?? [];
  const list = Array.isArray(raw) ? raw : Object.values(raw);
  return list
    .map((d) => ({ t: Math.floor((ms(d.date) ?? 0) / 1000), amount: num(d.amount) ?? 0 }))
    .filter((d) => d.t > 0 && d.amount > 0)
    .sort((a, b) => a.t - b.t);
}
const cachedDividends = unstable_cache(fetchDividends, ["yf-div-v1"], { revalidate: 43200 });

/** Historique des dividendes versés depuis 2000. */
export async function getDividends(symbol: string): Promise<Dividend[]> {
  try {
    return await cachedDividends(symbol);
  } catch (e) {
    console.error("[yahoo] dividends", symbol, (e as Error).message);
    return [];
  }
}

// ---------- Mini-courbes (plusieurs symboles d'un coup) ----------

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

async function fetchSparks(symbols: string[], range: string, interval: string): Promise<Record<string, number[]>> {
  const out: Record<string, number[]> = {};
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += 20) chunks.push(symbols.slice(i, i + 20));
  await Promise.all(
    chunks.map(async (c) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${c
        .map(encodeURIComponent)
        .join(",")}&range=${range}&interval=${interval}`;
      try {
        const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate: 900 } });
        if (!res.ok) return;
        const json = await res.json();
        for (const s of c) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const node: any = json?.[s] ?? json?.spark?.result?.find((r: any) => r.symbol === s)?.response?.[0];
          const closes: unknown[] = node?.close ?? node?.indicators?.quote?.[0]?.close ?? [];
          out[s] = closes.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
        }
      } catch (e) {
        console.error("[yahoo] spark", (e as Error).message);
      }
    }),
  );
  return out;
}

export async function getSparks(symbols: string[], range = "1mo", interval = "1d") {
  if (!symbols.length) return {};
  return fetchSparks(symbols, range, interval);
}

// ---------- Fiche détaillée ----------

export interface Fundamentals {
  description: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  website: string | null;
  employees: number | null;
  targetMean: number | null;
  targetHigh: number | null;
  targetLow: number | null;
  analysts: number | null;
  recommendationKey: string | null;
  recommendationMean: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  profitMargin: number | null;
  roe: number | null;
  debtToEquity: number | null;
  beta: number | null;
  pegRatio: number | null;
  trend: { period: string; strongBuy: number; buy: number; hold: number; sell: number; strongSell: number }[];
  exDividendDate: number | null;
  dividendDate: number | null;
  payoutRatio: number | null;
  fiveYearAvgDividendYield: number | null;
  earningsDates: number[];
}

async function fetchFundamentals(symbol: string): Promise<Fundamentals | null> {
  const s = await yf.quoteSummary(
    symbol,
    {
      modules: [
        "financialData",
        "summaryDetail",
        "defaultKeyStatistics",
        "assetProfile",
        "recommendationTrend",
        "calendarEvents",
      ],
    },
    NO_VALIDATE,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a: any = s;
  const fd = a.financialData ?? {};
  const ks = a.defaultKeyStatistics ?? {};
  const sd = a.summaryDetail ?? {};
  const ap = a.assetProfile ?? {};
  const ce = a.calendarEvents ?? {};
  return {
    description: ap.longBusinessSummary ?? null,
    sector: ap.sectorDisp ?? ap.sector ?? null,
    industry: ap.industryDisp ?? ap.industry ?? null,
    country: ap.country ?? null,
    website: ap.website ?? null,
    employees: num(ap.fullTimeEmployees),
    targetMean: num(fd.targetMeanPrice),
    targetHigh: num(fd.targetHighPrice),
    targetLow: num(fd.targetLowPrice),
    analysts: num(fd.numberOfAnalystOpinions),
    recommendationKey: fd.recommendationKey ?? null,
    recommendationMean: num(fd.recommendationMean),
    revenueGrowth: num(fd.revenueGrowth),
    earningsGrowth: num(fd.earningsGrowth),
    profitMargin: num(fd.profitMargins),
    roe: num(fd.returnOnEquity),
    debtToEquity: num(fd.debtToEquity),
    beta: num(sd.beta ?? ks.beta),
    pegRatio: num(ks.pegRatio),
    trend: (a.recommendationTrend?.trend ?? []).map((t: Record<string, unknown>) => ({
      period: String(t.period),
      strongBuy: Number(t.strongBuy ?? 0),
      buy: Number(t.buy ?? 0),
      hold: Number(t.hold ?? 0),
      sell: Number(t.sell ?? 0),
      strongSell: Number(t.strongSell ?? 0),
    })),
    exDividendDate: ms(ce.exDividendDate ?? sd.exDividendDate),
    dividendDate: ms(ce.dividendDate),
    payoutRatio: num(sd.payoutRatio),
    fiveYearAvgDividendYield: num(sd.fiveYearAvgDividendYield),
    earningsDates: ((ce.earnings?.earningsDate ?? []) as unknown[]).map(ms).filter((x): x is number => x != null),
  };
}

const cachedFundamentals = unstable_cache(fetchFundamentals, ["yf-fund-v2"], { revalidate: 21600 });

export async function getFundamentals(symbol: string): Promise<Fundamentals | null> {
  try {
    return await cachedFundamentals(symbol);
  } catch (e) {
    console.error("[yahoo] fundamentals", symbol, (e as Error).message);
    return null;
  }
}

// ---------- Recherche & actus par actif ----------

export interface SearchHit {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  date: number;
}

async function fetchSearch(q: string): Promise<SearchHit[]> {
  const r = await yf.search(q, { quotesCount: 10, newsCount: 0 }, NO_VALIDATE);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((r as any).quotes ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((x: any) => x.symbol && x.isYahooFinance !== false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((x: any) => ({
      symbol: x.symbol,
      name: x.longname ?? x.shortname ?? x.symbol,
      type: x.quoteType ?? "",
      exchange: x.exchDisp ?? x.exchange ?? "",
    }));
}
const cachedSearch = unstable_cache(fetchSearch, ["yf-search-v1"], { revalidate: 86400 });

export async function searchSymbols(q: string): Promise<SearchHit[]> {
  try {
    return await cachedSearch(q.trim().toLowerCase());
  } catch (e) {
    console.error("[yahoo] search", (e as Error).message);
    return [];
  }
}

async function fetchSymbolNews(query: string): Promise<NewsItem[]> {
  const r = await yf.search(query, { quotesCount: 0, newsCount: 10 }, NO_VALIDATE);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((r as any).news ?? []).map((n: any) => ({
    title: n.title,
    link: n.link,
    source: n.publisher ?? "Yahoo Finance",
    date: ms(n.providerPublishTime) ?? Date.now(),
  }));
}
const cachedSymbolNews = unstable_cache(fetchSymbolNews, ["yf-news-v1"], { revalidate: 1800 });

export async function getSymbolNews(query: string): Promise<NewsItem[]> {
  try {
    return await cachedSymbolNews(query);
  } catch {
    return [];
  }
}

/**
 * Fondamentaux de nombreuses valeurs, par petits lots (mis en cache 6 h par valeur).
 * Au-delà du budget de temps, on renvoie ce qui est disponible plutôt que de bloquer la page.
 */
export async function getFundamentalsMany(symbols: string[], concurrency = 8, budgetMs = 15000): Promise<Map<string, Fundamentals>> {
  const out = new Map<string, Fundamentals>();
  const queue = [...symbols];
  const deadline = Date.now() + budgetMs;
  const worker = async () => {
    while (queue.length && Date.now() < deadline) {
      const s = queue.shift() as string;
      const f = await getFundamentals(s);
      if (f) out.set(s, f);
    }
  };
  await Promise.race([
    Promise.all(Array.from({ length: concurrency }, worker)),
    new Promise((r) => setTimeout(r, budgetMs)),
  ]);
  return out;
}
