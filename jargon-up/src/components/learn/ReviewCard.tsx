import Link from "next/link";
import { requireProfile } from "@/lib/auth/session";
import { countDueReviews } from "@/lib/review/build";
import { fr } from "@/lib/i18n/fr";

/** Rappel des mots à réviser (affiché seulement s'il y en a). À placer sous <Suspense>. */
export async function ReviewCard() {
  const profile = await requireProfile();
  const due = await countDueReviews(profile.id);
  if (due === 0) return null;

  return (
    <section className="flex items-center gap-3 rounded-box border-2 border-secondary bg-secondary/10 p-4">
      <span className="text-3xl" aria-hidden>
        🧠
      </span>
      <p className="flex-1 font-semibold">{fr.review.due(due)}</p>
      <Link href="/review" className="btn btn-pop btn-secondary btn-sm">
        {fr.review.start}
      </Link>
    </section>
  );
}
