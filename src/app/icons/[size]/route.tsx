import { brandIcon } from "@/lib/brand-icon";

const SIZES = new Set(["192", "512", "maskable-512"]);

export function generateStaticParams() {
  return Array.from(SIZES).map((size) => ({ size }));
}

export async function GET(_req: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size } = await ctx.params;
  if (!SIZES.has(size)) return new Response("Introuvable", { status: 404 });
  const maskable = size.startsWith("maskable");
  return brandIcon(Number(size.replace("maskable-", "")), maskable);
}
