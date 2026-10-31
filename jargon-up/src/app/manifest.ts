import type { MetadataRoute } from "next";
import { fr } from "@/lib/i18n/fr";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${fr.app.name} — ${fr.app.tagline}`,
    short_name: fr.app.name,
    description: fr.app.description,
    lang: "fr",
    start_url: "/learn",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#6c4cf1",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
