import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LearnPath } from "@/components/learn/LearnPath";
import { ReviewCard } from "@/components/learn/ReviewCard";
import { WordOfDayCard } from "@/components/learn/WordOfDayCard";
import { Mascot } from "@/components/game/Mascot";
import { requireProfile } from "@/lib/auth/session";
import { loadPath } from "@/lib/learn/load";
import { fr } from "@/lib/i18n/fr";

export default function LearnPage() {
  return (
    <main className="mx-auto flex w-full app-width flex-1 flex-col gap-6 px-4 py-6">
      {/* Tablette : mot du jour et révision côte à côte (la carte de révision peut être absente). */}
      <div className="flex flex-col gap-6 md:flex-row md:items-stretch md:*:flex-1">
        <Suspense fallback={<div className="h-24 w-full skeleton" />}>
          <WordOfDayCard />
        </Suspense>
        <Suspense fallback={null}>
          <ReviewCard />
        </Suspense>
      </div>
      <Suspense fallback={<PathSkeleton />}>
        <PathLoader />
      </Suspense>
    </main>
  );
}

async function PathLoader() {
  const profile = await requireProfile();
  if (!profile.field_id) redirect("/onboarding");

  const path = await loadPath(profile);
  if (path.length === 0) return <EmptyPath />;
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
