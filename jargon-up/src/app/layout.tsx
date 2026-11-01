import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { Providers } from "@/components/Providers";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import { ServiceWorker } from "@/components/ServiceWorker";
import { SITE_URL } from "@/lib/site";
import { installCaptureScript } from "@/lib/pwa-install";
import { themeInitScript } from "@/lib/theme";
import { fr } from "@/lib/i18n/fr";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${fr.app.name} — ${fr.app.tagline}`,
    template: `%s · ${fr.app.name}`,
  },
  description: fr.app.description,
  applicationName: fr.app.name,
  keywords: [
    "anglais professionnel",
    "anglais technique",
    "vocabulaire informatique anglais",
    "apprendre l'anglais",
    "Togo",
    "Afrique de l'Ouest",
  ],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: fr.app.name,
    title: `${fr.app.name} — ${fr.app.tagline}`,
    description: fr.app.description,
  },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: fr.app.name, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f1" },
    { media: "(prefers-color-scheme: dark)", color: "#17132a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${nunito.variable} ${fredoka.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Applique le thème choisi avant l'affichage (évite un flash clair/sombre). */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/* Capte l'événement d'installation Android dès le début (voir lib/pwa-install.ts). */}
        <script dangerouslySetInnerHTML={{ __html: installCaptureScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-base-100 font-sans text-base-content">
        <Providers>
          {children}
          {/* Lisent l'adresse de la page : sous Suspense pour ne pas bloquer le prérendu. */}
          <Suspense fallback={null}>
            <InstallPrompt />
            <UpdatePrompt />
          </Suspense>
        </Providers>
        <ServiceWorker />
      </body>
    </html>
  );
}
