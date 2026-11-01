import Link from "next/link";
import { requireProfile } from "@/lib/auth/session";
import { countDueReviews } from "@/lib/review/build";
import { fr } from "@/lib/i18n/fr";
import { Brain } from "lucide-react";

/** Rappel des mots à réviser (affiché seulement s'il y en a). À placer sous <Suspense>. */
export async function ReviewCard() {
  const profile = await requireProfile();
  if (!profile.field_id) return null;
  const due = await countDueReviews(profile.id, profile.field_id);
  if (due === 0) return null;

  return (
    <section className="flex items-center gap-3 rounded-box border-2 border-secondary bg-secondary/10 p-4">
      <Brain className="size-8 shrink-0 text-secondary" aria-hidden />
      <p className="flex-1 font-semibold">{fr.review.due(due)}</p>
      <Link href="/review" className="btn btn-pop btn-secondary btn-sm">
        {fr.review.start}
      </Link>
    </section>
  );
}
