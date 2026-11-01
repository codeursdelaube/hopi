import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { Mascot } from "@/components/game/Mascot";
import { requireProfile } from "@/lib/auth/session";
import { buildReviewSession } from "@/lib/review/build";
import { fr } from "@/lib/i18n/fr";
import { completeReview } from "./actions";

export const metadata: Metadata = { title: fr.review.title };

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <span className="loading loading-lg loading-dots" aria-label={fr.review.loading} />
        </div>
      }
    >
      <ReviewLoader />
    </Suspense>
  );
}

async function ReviewLoader() {
  const profile = await requireProfile();
  if (!profile.field_id) redirect("/onboarding");

  const { exercises, mode } = await buildReviewSession(profile.id, profile.field_id);
  if (exercises.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <Mascot mood="proud" size={150} />
        <h1 className="font-display text-2xl font-bold">{fr.review.nothingTitle}</h1>
        <p className="text-base-content/70">{fr.review.nothingText}</p>
        <Link href="/learn" className="btn btn-pop btn-primary">
          {fr.lesson.backToPath}
        </Link>
      </div>
    );
  }

  return (
    <>
      {mode === "practice" && (
        <p role="status" className="mt-3 rounded-box bg-info/10 px-3 py-2 text-center text-sm">
          {fr.review.practiceNote}
        </p>
      )}
      <LessonPlayer
        exercises={exercises}
        finish={completeReview}
        soundEnabled={profile.sound_enabled}
        mode="review"
      />
    </>
  );
}
