import { Suspense } from "react";
import type { Metadata } from "next";
import { ClaimWordButton } from "@/components/learn/ClaimWordButton";
import { Mascot } from "@/components/game/Mascot";
import { ExplainToggle } from "@/components/ui/ExplainToggle";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { requireProfile } from "@/lib/auth/session";
import { getWordOfDay, hasClaimedWordOfDay } from "@/lib/words/daily";
import { fr } from "@/lib/i18n/fr";

export const metadata: Metadata = { title: fr.word.title };

export default function WordOfTheDayPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <h1 className="font-display text-3xl font-bold">{fr.word.title}</h1>
      <Suspense fallback={<div className="h-96 w-full skeleton" />}>
        <WordLoader />
      </Suspense>
    </main>
  );
}

async function WordLoader() {
  const profile = await requireProfile();
  const word = profile.field_id ? await getWordOfDay(profile.field_id) : null;
  if (!word) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <Mascot mood="neutral" size={120} />
        <p>{fr.word.none}</p>
      </div>
    );
  }
  const claimed = await hasClaimedWordOfDay(profile.id);

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 rounded-box border-2 border-accent bg-accent/10 p-6 text-center">
        <Mascot mood="happy" size={100} />
        <p lang="en" className="font-display text-4xl font-bold break-words">
          {word.term}
        </p>
        <p className="text-base-content/70">
          {word.pronunciation_ipa} {word.part_of_speech && <em>· {word.part_of_speech}</em>}
        </p>
        <SpeakButton
          text={word.term}
          label={fr.word.listen(word.term)}
          className="btn-circle size-16 text-2xl btn-accent"
        />
      </div>

      <section className="flex flex-col gap-1">
        <h2 className="text-sm font-bold text-base-content/60 uppercase">{fr.word.definition}</h2>
        <p lang="en" className="text-lg">
          {word.definition_en}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-base-content/60 uppercase">{fr.word.example}</h2>
        <div className="flex items-start gap-3">
          <SpeakButton
            text={word.example_en}
            label={fr.word.listen(word.example_en)}
            className="btn-circle btn-ghost btn-sm"
          />
          <div>
            <p lang="en" className="text-lg font-semibold">
              {word.example_en}
            </p>
            {word.example_fr && <p className="text-base-content/60">{word.example_fr}</p>}
          </div>
        </div>
      </section>

      <ExplainToggle text={word.explanation_fr} />

      <ClaimWordButton alreadyClaimed={claimed} soundEnabled={profile.sound_enabled} />
    </article>
  );
}
