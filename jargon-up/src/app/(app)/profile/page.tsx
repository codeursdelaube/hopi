import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Mascot } from "@/components/game/Mascot";
import { requireProfile } from "@/lib/auth/session";
import { getHeaderStats } from "@/lib/game/stats";
import { createClient } from "@/lib/supabase/server";
import { fr } from "@/lib/i18n/fr";

const t = fr.profile;

export const metadata: Metadata = { title: t.title };

export default function ProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <Suspense fallback={<div className="h-[32rem] w-full skeleton" />}>
        <ProfileContent />
      </Suspense>
    </main>
  );
}

async function ProfileContent() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [stats, full, lessons, words, badges, owned] = await Promise.all([
    getHeaderStats(profile),
    supabase.from("profiles").select("longest_streak, created_at").eq("id", profile.id).single(),
    supabase
      .from("lesson_progress")
      .select("lesson_id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .not("completed_at", "is", null),
    supabase
      .from("term_reviews")
      .select("term_id", { count: "exact", head: true })
      .eq("user_id", profile.id),
    supabase.from("badges").select("id, slug, name_fr, description_fr, icon").order("slug"),
    supabase.from("user_badges").select("badge_id").eq("user_id", profile.id),
  ]);

  const ownedIds = new Set((owned.data ?? []).map((b) => b.badge_id));
  const memberSince = full.data
    ? new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
        new Date(full.data.created_at),
      )
    : null;

  const tiles = [
    { label: t.stats.totalXp, value: `⭐ ${stats.totalXp}` },
    { label: t.stats.streak, value: `🔥 ${stats.streak}` },
    { label: t.stats.longest, value: `🏅 ${full.data?.longest_streak ?? 0}` },
    { label: t.stats.lessons, value: `📘 ${lessons.count ?? 0}` },
    { label: t.stats.words, value: `💬 ${words.count ?? 0}` },
  ];

  return (
    <>
      <section className="flex items-center gap-4">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            width={80}
            height={80}
            referrerPolicy="no-referrer"
            className="rounded-full border-4 border-primary/30"
          />
        ) : (
          <Mascot mood="happy" size={80} />
        )}
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate font-display text-2xl font-bold">{profile.display_name}</h1>
          {memberSince && (
            <p className="text-sm text-base-content/60">{t.memberSince(memberSince)}</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-1 rounded-box border-2 border-warning/50 p-4">
        <p className="font-display text-xl font-bold text-warning">
          ⭐ {t.level(stats.level.level)}
        </p>
        <progress
          className="progress h-3 w-full progress-warning"
          value={stats.level.current}
          max={stats.level.needed}
        />
        <p className="text-sm text-base-content/60">
          {t.nextLevel(stats.level.current, stats.level.needed)}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-box border-2 border-base-300 p-3">
            <p className="font-display text-2xl font-bold">{tile.value}</p>
            <p className="text-sm text-base-content/60">{tile.label}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold">{t.badges}</h2>
        <ul className="grid grid-cols-2 gap-3">
          {(badges.data ?? []).map((b) => {
            const earned = ownedIds.has(b.id);
            return (
              <li
                key={b.id}
                className={`flex flex-col items-center gap-1 rounded-box border-2 p-3 text-center ${
                  earned ? "border-warning bg-warning/10" : "border-base-300 opacity-50 grayscale"
                }`}
              >
                <span className="text-4xl" aria-hidden>
                  {b.icon}
                </span>
                <span className="font-semibold">{b.name_fr}</span>
                <span className="text-xs text-base-content/70">
                  {earned ? b.description_fr : `${t.locked} · ${b.description_fr}`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <Link href="/settings" className="btn btn-pop btn-lg">
        ⚙️ {t.settings}
      </Link>
    </>
  );
}
