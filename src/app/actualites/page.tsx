import type { Metadata } from "next";
import Link from "next/link";
import { getNews, NEWS_LABEL, type NewsCategory } from "@/lib/news";
import { fmtDateTime, timeAgo } from "@/lib/format";
import { Badge, Empty, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Actualités" };
export const revalidate = 600;

const CATS = Object.keys(NEWS_LABEL) as NewsCategory[];

export default async function NewsPage(props: PageProps<"/actualites">) {
  const sp = await props.searchParams;
  const cat = typeof sp.cat === "string" && CATS.includes(sp.cat as NewsCategory) ? (sp.cat as NewsCategory) : null;
  const news = await getNews(cat ? [cat] : undefined);
  const sources = Array.from(new Set(news.map((n) => n.source))).sort((a, b) => a.localeCompare(b, "fr"));

  return (
    <div>
      <PageTitle title="Actualités" subtitle="Les derniers articles des médias financiers et crypto, rassemblés en un seul fil." />
      <nav className="flex flex-wrap gap-2 pb-4 border-b border-line" aria-label="Catégories">
        <Tab href="/actualites" active={!cat}>
          Tout
        </Tab>
        {CATS.map((c) => (
          <Tab key={c} href={`/actualites?cat=${c}`} active={cat === c}>
            {NEWS_LABEL[c]}
          </Tab>
        ))}
      </nav>
      <div className="grid gap-10 lg:grid-cols-[1fr_240px] mt-2">
        <ul>
          {news.slice(0, 80).map((n) => (
            <li key={n.link} className="border-b border-line">
              <a href={n.link} target="_blank" rel="noopener noreferrer" className="grid sm:grid-cols-[7.5rem_1fr] gap-x-6 gap-y-1 py-4 group">
                <span className="ticker pt-0.5" title={fmtDateTime(n.date)}>
                  {timeAgo(n.date)}
                </span>
                <span>
                  <span className="block text-[1.02rem] leading-snug group-hover:text-accent">{n.title}</span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="text-sm text-ink-3">{n.source}</span>
                    {!cat && <Badge>{NEWS_LABEL[n.category].split(" ")[0]}</Badge>}
                  </span>
                </span>
              </a>
            </li>
          ))}
          {!news.length && <Empty>Aucune actualité disponible pour le moment.</Empty>}
        </ul>
        <aside className="hidden lg:block">
          <p className="eyebrow mt-4 mb-2">Sources</p>
          <ul className="text-sm text-ink-2 space-y-1.5">
            {sources.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="ticker mt-6 leading-relaxed">Les liens ouvrent l’article sur le site du média. Mise à jour toutes les 10 à 15 minutes.</p>
        </aside>
      </div>
    </div>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`px-3 py-1.5 rounded-md text-sm ${active ? "bg-ink text-bg" : "text-ink-2 hover:text-ink bg-surface-2"}`}
    >
      {children}
    </Link>
  );
}
