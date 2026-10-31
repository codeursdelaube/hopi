import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Pages privées : inutile de les indexer (et elles redirigent vers /login).
      disallow: [
        "/learn",
        "/lesson/",
        "/review",
        "/onboarding",
        "/profile",
        "/settings",
        "/leaderboard",
        "/word-of-the-day",
        "/upgrade",
        "/auth/",
        "/offline",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
