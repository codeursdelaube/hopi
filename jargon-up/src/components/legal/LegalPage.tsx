import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LEGAL } from "@/lib/legal";

/** Mise en page commune des pages légales (lisible sur mobile, sans dépendance). */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/" className="btn self-start btn-ghost btn-sm">
        <ArrowLeft className="size-4" aria-hidden /> Hopi
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        <p className="text-sm text-base-content/60">Dernière mise à jour : {LEGAL.updatedAt}</p>
      </header>
      <div className="flex flex-col gap-4 leading-relaxed [&_a]:link [&_a]:link-primary [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
        {children}
      </div>
      <nav className="mt-6 flex flex-wrap gap-4 border-t-2 border-base-300 pt-4 text-sm">
        <Link href="/cgu" className="link link-hover">
          Conditions générales d&apos;utilisation
        </Link>
        <Link href="/confidentialite" className="link link-hover">
          Politique de confidentialité
        </Link>
      </nav>
    </main>
  );
}
