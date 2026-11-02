import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mascot } from "@/components/game/Mascot";
import { InstallButton } from "@/components/pwa/InstallButton";
import { BadgeIcon } from "@/components/ui/icons";
import { createAdminClient } from "@/lib/supabase/admin";
import { fr } from "@/lib/i18n/fr";

const t = fr.badgePage;

const SLUG_PATTERN = /^[a-z0-9_]{1,40}$/;

/** Badge lu avec la clé secrète : la page est publique (les badges ne sont lisibles que connecté). */
async function getBadge(slug: string) {
  if (!SLUG_PATTERN.test(slug)) return null;
  const { data, error } = await createAdminClient()
    .from("badges")
    .select("slug, name_fr, description_fr")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Chargement du badge : ${error.message}`);
  return data;
}

/** Aperçu du lien partagé sur les réseaux sociaux. */
export async function generateMetadata({ params }: PageProps<"/badge/[slug]">): Promise<Metadata> {
  const badge = await getBadge((await params).slug);
  const title = badge ? `${badge.name_fr} · ${t.invite}` : fr.app.name;
  return { title, description: t.text, openGraph: { title, description: t.text } };
}

/** Page publique d'un badge partagé : invite à découvrir et installer Hopi. */
export default function BadgePage({ params }: PageProps<"/badge/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <Suspense fallback={<div className="h-96 w-full skeleton" />}>
        <BadgeContent params={params} />
      </Suspense>
    </main>
  );
}

async function BadgeContent({ params }: Pick<PageProps<"/badge/[slug]">, "params">) {
  const badge = await getBadge((await params).slug);
  if (!badge) notFound();

  return (
    <>
      <p className="font-display text-2xl font-semibold text-primary">{fr.app.name}</p>
      <div className="flex size-36 items-center justify-center rounded-full border-4 border-warning bg-warning/15">
        <BadgeIcon slug={badge.slug} className="size-20 text-warning" />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-base-content/60">{t.invite}</p>
        <h1 className="font-display text-3xl font-bold">{badge.name_fr}</h1>
        <p className="text-base-content/70">{badge.description_fr}</p>
      </div>
      <div className="flex items-center gap-3 rounded-box bg-base-200 p-3 text-left text-sm">
        <Mascot mood="happy" size={56} />
        <p>{t.text}</p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <Link href="/login" className="btn w-full btn-pop font-display text-lg btn-lg btn-primary">
          {t.cta}
        </Link>
        <InstallButton />
      </div>
    </>
  );
}
