import type { Metadata } from "next";
import Link from "next/link";
import { Mascot } from "@/components/game/Mascot";
import { fr } from "@/lib/i18n/fr";
import { Sparkles } from "lucide-react";

const t = fr.upgrade;

export const metadata: Metadata = { title: t.title };

/** Emplacement réservé à l'offre Premium : aucun paiement pour l'instant. */
export default function UpgradePage() {
  return (
    <main className="mx-auto flex w-full app-width flex-1 flex-col items-center gap-6 px-4 py-8 text-center">
      <Mascot mood="proud" size={140} />
      <h1 className="font-display text-3xl font-bold">
        {t.title} <span className="badge align-middle badge-lg badge-warning">{t.soon}</span>
      </h1>
      <p className="text-base-content/70">{t.intro}</p>
      <ul className="grid w-full gap-2 text-left md:grid-cols-2">
        {t.perks.map((perk) => (
          <li
            key={perk}
            className="flex items-center gap-3 rounded-box border-2 border-base-300 p-3"
          >
            <Sparkles className="size-5 shrink-0 text-warning" aria-hidden />
            {perk}
          </li>
        ))}
      </ul>
      <Link href="/settings" className="btn btn-ghost">
        {t.back}
      </Link>
    </main>
  );
}
