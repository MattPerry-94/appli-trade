import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Modèle de cache « classique » (revalidate + unstable_cache) : adapté à des données
  // de marché rafraîchies toutes les minutes.
  cacheComponents: false,
  partialPrefetching: false,
  serverExternalPackages: ["yahoo-finance2"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "coin-images.coingecko.com" }],
  },
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
