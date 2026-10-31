import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LearnPath } from "@/components/learn/LearnPath";
import { Mascot } from "@/components/game/Mascot";
import { requireProfile } from "@/lib/auth/session";
import { buildPath } from "@/lib/learn/path";
import { createClient } from "@/lib/supabase/server";
import { fr } from "@/lib/i18n/fr";

export default function LearnPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6">
      <Suspense fallback={<PathSkeleton />}>
        <PathLoader />
      </Suspense>
    </main>
  );
}

async function PathLoader() {
  const profile = await requireProfile();
  if (!profile.field_id) redirect("/onboarding");

  const supabase = await createClient();
  const [unitsRes, progressRes] = await Promise.all([
    supabase
      .from("units")
      .select("id, level, position, title_en, title_fr")
      .eq("field_id", profile.field_id)
      .order("position"),
    supabase
      .from("lesson_progress")
      .select("lesson_id")
      .eq("user_id", profile.id)
      .not("completed_at", "is", null),
  ]);
  if (unitsRes.error) throw new Error(`Chargement des unités : ${unitsRes.error.message}`);
  if (progressRes.error)
    throw new Error(`Chargement de la progression : ${progressRes.error.message}`);

  const units = unitsRes.data;
  if (units.length === 0) return <EmptyPath />;

  const lessonsRes = await supabase
    .from("lessons")
    .select("id, unit_id, position, title_en, xp_reward")
    .in(
      "unit_id",
      units.map((u) => u.id),
    )
    .order("position");
  if (lessonsRes.error) throw new Error(`Chargement des leçons : ${lessonsRes.error.message}`);

  const path = buildPath(
    units.map((u) => ({
      ...u,
      lessons: lessonsRes.data.filter((l) => l.unit_id === u.id),
    })),
    new Set(progressRes.data.map((p) => p.lesson_id)),
    profile.level,
  );

  return <LearnPath units={path} />;
}

function EmptyPath() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <Mascot mood="neutral" size={140} />
      <p className="text-base-content/70">{fr.learn.noContent}</p>
      <Link href="/onboarding" className="btn btn-ghost">
        {fr.learn.changeSettings}
      </Link>
    </div>
  );
}

function PathSkeleton() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="h-20 w-full skeleton" />
      {[0, 44, 66, 44].map((x, i) => (
        <div
          key={i}
          className="size-18 skeleton rounded-full"
          style={{ transform: `translateX(${x}px)` }}
        />
      ))}
    </div>
  );
}
