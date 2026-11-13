import "server-only";
import { XMLParser } from "fast-xml-parser";
import type { NewsItem } from "./yahoo";

export type NewsCategory = "marches" | "crypto" | "asie" | "international";

export const NEWS_LABEL: Record<NewsCategory, string> = {
  marches: "Marchés & entreprises",
  crypto: "Crypto",
  asie: "Asie",
  international: "International (EN)",
};

interface Feed {
  url: string;
  source: string;
  category: NewsCategory;
}

const FEEDS: Feed[] = [
  { url: "https://fr.investing.com/rss/news.rss", source: "Investing.com", category: "marches" },
  { url: "https://www.lefigaro.fr/rss/figaro_bourse.xml", source: "Le Figaro Bourse", category: "marches" },
  { url: "https://www.latribune.fr/rss/rubriques/bourse.html", source: "La Tribune", category: "marches" },
  { url: "https://cryptoast.fr/feed/", source: "Cryptoast", category: "crypto" },
  { url: "https://journalducoin.com/feed/", source: "Journal du Coin", category: "crypto" },
  { url: "https://cointelegraph.com/rss", source: "Cointelegraph", category: "crypto" },
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk", category: "crypto" },
  {
    url: "https://news.google.com/rss/search?q=Nikkei+OR+%22Hang+Seng%22+OR+%22Bourse+de+Tokyo%22+OR+%22Bourse+de+Shanghai%22+when:3d&hl=fr&gl=FR&ceid=FR:fr",
    source: "Google Actualités",
    category: "asie",
  },
  { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", source: "CNBC", category: "international" },
  { url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", source: "MarketWatch", category: "international" },
];

const parser = new XMLParser({ ignoreAttributes: true, htmlEntities: true, processEntities: true });

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object" && "#text" in (v as Record<string, unknown>)) return text((v as Record<string, unknown>)["#text"]);
  return "";
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function readFeed(feed: Feed): Promise<(NewsItem & { category: NewsCategory })[]> {
  try {
    const res = await fetch(feed.url, { headers: { "User-Agent": UA }, next: { revalidate: 900 } });
    if (!res.ok) return [];
    const xml = await res.text();
    const doc = parser.parse(xml);
    const raw = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? [];
    const items = Array.isArray(raw) ? raw : [raw];
    return items
      .slice(0, 25)
      .map((it: Record<string, unknown>) => {
        let title = decode(text(it.title));
        let source = feed.source;
        // Google Actualités : « Titre - Média »
        if (feed.url.includes("news.google.com")) {
          const m = title.match(/^(.*) - ([^-]+)$/);
          if (m) {
            title = m[1];
            source = m[2].trim();
          }
        }
        const link = text(it.link) || text(it.guid);
        const date = Date.parse(text(it.pubDate) || text(it.published) || text(it.updated));
        return { title, link, source, date: Number.isNaN(date) ? Date.now() : date, category: feed.category };
      })
      .filter((n) => n.title && n.link);
  } catch (e) {
    console.error("[news]", feed.source, (e as Error).message);
    return [];
  }
}

export async function getNews(categories?: NewsCategory[]): Promise<(NewsItem & { category: NewsCategory })[]> {
  const feeds = categories ? FEEDS.filter((f) => categories.includes(f.category)) : FEEDS;
  const all = (await Promise.all(feeds.map(readFeed))).flat();
  const seen = new Set<string>();
  return all
    .filter((n) => {
      const k = n.title.toLowerCase().slice(0, 60);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .filter((n) => n.date <= Date.now() + 3600_000)
    .sort((a, b) => b.date - a.date);
}
