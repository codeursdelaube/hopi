import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Identifiant de la version déployée (commit Vercel) : sert à proposer la mise à jour
    // aux utilisateurs dont l'appli ouverte est plus ancienne (voir UpdatePrompt).
    NEXT_PUBLIC_APP_VERSION: process.env.VERCEL_GIT_COMMIT_SHA ?? `local-${Date.now()}`,
  },
  experimental: {
    agentFeedback: true,
  },
  // Ancien défi de 7 jours (remplacé par les salles Tri express) : les liens déjà partagés
  // mènent à l'accueil plutôt qu'à une page introuvable.
  async redirects() {
    return [{ source: "/defi/:path*", destination: "/", permanent: false }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
