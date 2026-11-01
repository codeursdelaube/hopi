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
