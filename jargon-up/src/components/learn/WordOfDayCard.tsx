import Link from "next/link";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { requireProfile } from "@/lib/auth/session";
import { getWordOfDay, hasClaimedWordOfDay } from "@/lib/words/daily";
import { fr } from "@/lib/i18n/fr";

/** Widget « Mot du jour » en haut du parcours (à placer sous <Suspense>). */
export async function WordOfDayCard() {
  const profile = await requireProfile();
  if (!profile.field_id) return null;

  const [word, claimed] = await Promise.all([
    getWordOfDay(profile.field_id),
    hasClaimedWordOfDay(profile.id),
  ]);
  if (!word) return null;

  return (
    <section
      aria-label={fr.word.title}
      className="flex items-center gap-3 rounded-box border-2 border-accent bg-accent/10 p-4"
    >
      <SpeakButton
        text={word.term}
        label={fr.word.listen(word.term)}
        className="btn-circle btn-accent"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs font-bold text-accent uppercase">
          {fr.word.title} {claimed && "✓"}
        </span>
        <span lang="en" className="truncate font-display text-xl font-bold">
          {word.term}
        </span>
        {word.pronunciation_ipa && (
          <span className="text-sm text-base-content/60">{word.pronunciation_ipa}</span>
        )}
      </div>
      <Link href="/word-of-the-day" className="btn btn-accent btn-sm">
        {fr.word.see}
      </Link>
    </section>
  );
}
