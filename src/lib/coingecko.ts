import "server-only";

// API CoinGecko — fonctionne sans clé. Une clé « Demo » gratuite (COINGECKO_API_KEY)
// augmente simplement le quota.
const BASE = "https://api.coingecko.com/api/v3";

function headers(): HeadersInit {
  const h: Record<string, string> = { accept: "application/json" };
  if (process.env.COINGECKO_API_KEY) h["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
  return h;
}

async function cg<T>(path: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { headers: headers(), next: { revalidate } });
    if (!res.ok) {
      console.error("[coingecko]", res.status, path);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.error("[coingecko]", (e as Error).message, path);
    return null;
  }
}

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  marketCap: number;
  rank: number;
  volume: number;
  high24h: number | null;
  low24h: number | null;
  ch1h: number | null;
  ch24h: number | null;
  ch7d: number | null;
  ch30d: number | null;
  ch1y: number | null;
  ath: number | null;
  athChangePct: number | null;
  athDate: string | null;
  circulating: number | null;
  maxSupply: number | null;
  spark: number[];
}

interface RawCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number | null;
  low_24h: number | null;
  price_change_percentage_1h_in_currency?: number | null;
  price_change_percentage_24h_in_currency?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  price_change_percentage_30d_in_currency?: number | null;
  price_change_percentage_1y_in_currency?: number | null;
  ath: number | null;
  ath_change_percentage: number | null;
  ath_date: string | null;
  circulating_supply: number | null;
  max_supply: number | null;
  sparkline_in_7d?: { price: number[] };
}

function mapCoin(c: RawCoin): Coin {
  return {
    id: c.id,
    symbol: c.symbol.toUpperCase(),
    name: c.name,
    image: c.image,
    price: c.current_price,
    marketCap: c.market_cap,
    rank: c.market_cap_rank,
    volume: c.total_volume,
    high24h: c.high_24h,
    low24h: c.low_24h,
    ch1h: c.price_change_percentage_1h_in_currency ?? null,
    ch24h: c.price_change_percentage_24h_in_currency ?? null,
    ch7d: c.price_change_percentage_7d_in_currency ?? null,
    ch30d: c.price_change_percentage_30d_in_currency ?? null,
    ch1y: c.price_change_percentage_1y_in_currency ?? null,
    ath: c.ath,
    athChangePct: c.ath_change_percentage,
    athDate: c.ath_date,
    circulating: c.circulating_supply,
    maxSupply: c.max_supply,
    spark: (c.sparkline_in_7d?.price ?? []).filter((_, i, a) => a.length < 60 || i % 4 === 0),
  };
}

const STABLES = new Set(["usdt", "usdc", "dai", "fdusd", "tusd", "usde", "usds", "pyusd", "usd1", "eurc", "busd", "usdd", "rlusd"]);

export function isStablecoin(c: Pick<Coin, "symbol">): boolean {
  return STABLES.has(c.symbol.toLowerCase());
}

const DERIVED = /wrapped|staked|bridged|restaked|liquid staking|heloc|tokenized|binance-peg/i;
const DERIVED_SYMBOLS = new Set(["wbtc", "weth", "steth", "wsteth", "weeth", "cbbtc", "reth", "meth", "bsc-usd", "jitosol", "lbtc", "solvbtc", "susde", "bnsol", "wbeth", "rseth", "ezeth", "clbtc", "tbtc"]);

/** Vraie cryptomonnaie « de premier rang » (hors stablecoins, jetons emballés ou actifs tokenisés). */
export function isMainCoin(c: Pick<Coin, "symbol" | "name">): boolean {
  const s = c.symbol.toLowerCase();
  return !isStablecoin(c) && !DERIVED_SYMBOLS.has(s) && !DERIVED.test(c.name) && !s.includes("_");
}

export async function getCoins(perPage = 100, page = 1): Promise<Coin[]> {
  const data = await cg<RawCoin[]>(
    `/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=true&price_change_percentage=1h,24h,7d,30d,1y`,
    120,
  );
  return (data ?? []).map(mapCoin);
}

export interface GlobalCrypto {
  marketCap: number;
  volume: number;
  btcDominance: number;
  ethDominance: number;
  marketCapChange24h: number;
  activeCoins: number;
}

export async function getGlobal(): Promise<GlobalCrypto | null> {
  const d = await cg<{
    data: {
      total_market_cap: Record<string, number>;
      total_volume: Record<string, number>;
      market_cap_percentage: Record<string, number>;
      market_cap_change_percentage_24h_usd: number;
      active_cryptocurrencies: number;
    };
  }>("/global", 300);
  if (!d) return null;
  return {
    marketCap: d.data.total_market_cap.eur,
    volume: d.data.total_volume.eur,
    btcDominance: d.data.market_cap_percentage.btc,
    ethDominance: d.data.market_cap_percentage.eth,
    marketCapChange24h: d.data.market_cap_change_percentage_24h_usd,
    activeCoins: d.data.active_cryptocurrencies,
  };
}

export interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  image: string | null;
  description: string | null;
  homepage: string | null;
  categories: string[];
  genesis: string | null;
  price: number | null;
  ch24h: number | null;
  ch7d: number | null;
  ch30d: number | null;
  ch1y: number | null;
  marketCap: number | null;
  rank: number | null;
  volume: number | null;
  high24h: number | null;
  low24h: number | null;
  ath: number | null;
  athChangePct: number | null;
  athDate: string | null;
  atl: number | null;
  circulating: number | null;
  totalSupply: number | null;
  maxSupply: number | null;
}

export async function getCoinDetail(id: string): Promise<CoinDetail | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = await cg<any>(
    `/coins/${encodeURIComponent(id)}?localization=true&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
    300,
  );
  if (!d) return null;
  const md = d.market_data ?? {};
  const desc: string | null = d.description?.fr || d.description?.en || null;
  return {
    id: d.id,
    symbol: String(d.symbol).toUpperCase(),
    name: d.name,
    image: d.image?.large ?? null,
    description: desc ? desc.replace(/<[^>]+>/g, "").trim() : null,
    homepage: d.links?.homepage?.find((x: string) => x) ?? null,
    categories: (d.categories ?? []).filter(Boolean).slice(0, 4),
    genesis: d.genesis_date ?? null,
    price: md.current_price?.eur ?? null,
    ch24h: md.price_change_percentage_24h_in_currency?.eur ?? null,
    ch7d: md.price_change_percentage_7d_in_currency?.eur ?? null,
    ch30d: md.price_change_percentage_30d_in_currency?.eur ?? null,
    ch1y: md.price_change_percentage_1y_in_currency?.eur ?? null,
    marketCap: md.market_cap?.eur ?? null,
    rank: d.market_cap_rank ?? null,
    volume: md.total_volume?.eur ?? null,
    high24h: md.high_24h?.eur ?? null,
    low24h: md.low_24h?.eur ?? null,
    ath: md.ath?.eur ?? null,
    athChangePct: md.ath_change_percentage?.eur ?? null,
    athDate: md.ath_date?.eur ?? null,
    atl: md.atl?.eur ?? null,
    circulating: md.circulating_supply ?? null,
    totalSupply: md.total_supply ?? null,
    maxSupply: md.max_supply ?? null,
  };
}

/** Historique quotidien (365 jours max sur l'offre gratuite). */
export async function getCoinHistory(id: string, days = 365): Promise<{ t: number; c: number; v: number }[]> {
  const d = await cg<{ prices: [number, number][]; total_volumes: [number, number][] }>(
    `/coins/${encodeURIComponent(id)}/market_chart?vs_currency=eur&days=${days}&interval=daily`,
    1800,
  );
  if (!d) return [];
  const vol = new Map(d.total_volumes.map(([t, v]) => [Math.floor(t / 86400000), v]));
  return d.prices.map(([t, c]) => ({ t: Math.floor(t / 1000), c, v: vol.get(Math.floor(t / 86400000)) ?? 0 }));
}

export interface FearGreed {
  value: number;
  label: string;
  history: { t: number; value: number }[];
}

const FNG_FR: Record<string, string> = {
  "Extreme Fear": "Peur extrême",
  Fear: "Peur",
  Neutral: "Neutre",
  Greed: "Avidité",
  "Extreme Greed": "Avidité extrême",
};

export async function getFearGreed(): Promise<FearGreed | null> {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=90", { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const j = (await res.json()) as { data: { value: string; value_classification: string; timestamp: string }[] };
    const h = j.data.map((d) => ({ t: Number(d.timestamp), value: Number(d.value) })).reverse();
    return {
      value: Number(j.data[0].value),
      label: FNG_FR[j.data[0].value_classification] ?? j.data[0].value_classification,
      history: h,
    };
  } catch {
    return null;
  }
}

export async function getCoinsByIds(ids: string[]): Promise<Coin[]> {
  if (!ids.length) return [];
  const data = await cg<RawCoin[]>(
    `/coins/markets?vs_currency=eur&ids=${ids.map(encodeURIComponent).join(",")}&sparkline=true&price_change_percentage=1h,24h,7d,30d,1y`,
    120,
  );
  return (data ?? []).map(mapCoin);
}
