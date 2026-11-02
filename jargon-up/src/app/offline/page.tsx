import type { Metadata } from "next";
import Link from "next/link";
import { Mascot } from "@/components/game/Mascot";
import { fr } from "@/lib/i18n/fr";

export const metadata: Metadata = { title: fr.offline.title, robots: { index: false } };

/** Page de secours affichée par le service worker quand il n'y a pas de connexion. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center md:max-w-md">
      <Mascot mood="sad" size={150} />
      <h1 className="font-display text-2xl font-bold">{fr.offline.title}</h1>
      <p className="text-base-content/70">{fr.offline.text}</p>
      <Link href="/learn" className="btn btn-pop btn-primary">
        {fr.offline.retry}
      </Link>
    </main>
  );
}
