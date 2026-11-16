import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Boussole — marchés, actions & crypto",
    short_name: "Boussole",
    description: "Bourses, actions, ETF et cryptomonnaies, avec des tendances expliquées et votre portefeuille.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f5f1",
    theme_color: "#f6f5f1",
    categories: ["finance"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Portefeuille", url: "/portefeuille" },
      { name: "Favoris", url: "/favoris" },
      { name: "Crypto", url: "/crypto" },
    ],
  };
}
