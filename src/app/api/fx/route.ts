import { getEurRates } from "@/lib/fx";

/** Taux de change : nombre d'unités de chaque devise pour 1 €. */
export async function GET() {
  const rates = await getEurRates();
  return Response.json({ rates }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
