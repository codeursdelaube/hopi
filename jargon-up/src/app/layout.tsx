import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { Providers } from "@/components/Providers";
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
  title: {
    default: `${fr.app.name} — ${fr.app.tagline}`,
    template: `%s · ${fr.app.name}`,
  },
  description: fr.app.description,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#17132a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${nunito.variable} ${fredoka.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-base-100 font-sans text-base-content">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
