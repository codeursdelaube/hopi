import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { Mascot } from "@/components/game/Mascot";
import { isAiExplainAvailable } from "@/lib/ai/gemini";
import { requireProfile } from "@/lib/auth/session";
import { toPlayable } from "@/lib/exercises/load";
import { loadPath } from "@/lib/learn/load";
import { createClient } from "@/lib/supabase/server";
import { fr } from "@/lib/i18n/fr";
import { completeLesson } from "./actions";

export const metadata: Metadata = { title: "Leçon" };

export default function LessonPage({ params }: PageProps<"/lesson/[lessonId]">) {
  return (
    <Suspense fallback={<LessonSkeleton />}>
      <LessonLoader params={params} />
    </Suspense>
  );
}

async function LessonLoader({ params }: Pick<PageProps<"/lesson/[lessonId]">, "params">) {
  const { lessonId } = await params;
  if (!z.uuid().safeParse(lessonId).success) notFound();

  const profile = await requireProfile();
  const path = await loadPath(profile);
  const lesson = path.flatMap((u) => u.lessons).find((l) => l.id === lessonId);
  if (!lesson) notFound();
  if (lesson.state === "locked") return <Message text={fr.lesson.locked} />;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("id, type, payload, explanation_fr, term_id")
    .eq("lesson_id", lessonId)
    .order("position");
  if (error) throw new Error(`Chargement des exercices : ${error.message}`);

  const exercises = toPlayable(data);
  if (exercises.length === 0) return <Message text={fr.lesson.empty} />;

  return (
    <LessonPlayer
      exercises={exercises}
      finish={completeLesson.bind(null, lessonId)}
      soundEnabled={profile.sound_enabled}
      aiExplain={await isAiExplainAvailable()}
    />
  );
}

function Message({ text }: { text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <Mascot mood="sad" size={140} />
      <p>{text}</p>
      <Link href="/learn" className="btn btn-pop btn-primary">
        {fr.lesson.backToPath}
      </Link>
    </div>
  );
}

function LessonSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div className="h-4 w-full skeleton rounded-full" />
      <div className="h-8 w-3/4 skeleton" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-14 w-full skeleton" />
      ))}
    </div>
  );
}
