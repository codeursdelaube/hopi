import Link from "next/link";
import { requireProfile } from "@/lib/auth/session";
import { getHeaderStats } from "@/lib/game/stats";
import { fr } from "@/lib/i18n/fr";
import { Flame, Star, Target } from "lucide-react";

const t = fr.shell;

/** Série, XP, objectif du jour et niveau (à placer sous <Suspense>). */
export async function StatsBar() {
  const profile = await requireProfile();
  const stats = await getHeaderStats(profile);
  const goalRatio = Math.min(1, stats.todayXp / Math.max(1, stats.dailyGoal));

  return (
    <div className="flex items-center gap-1 sm:gap-3">
      <span
        className={`flex items-center gap-1 rounded-full px-2 py-1 font-display text-lg font-bold ${
          stats.goalDoneToday ? "text-secondary" : "text-base-content/40"
        }`}
        title={t.streak(stats.streak)}
        aria-label={t.streak(stats.streak)}
      >
        <Flame
          className="size-5"
          fill={stats.goalDoneToday ? "currentColor" : "none"}
          aria-hidden
        />
        {stats.streak}
      </span>

      <span
        className="radial-progress text-xs font-bold text-warning"
        style={
          {
            "--value": Math.round(goalRatio * 100),
            "--size": "2.4rem",
            "--thickness": "4px",
          } as React.CSSProperties
        }
        role="progressbar"
        aria-valuenow={Math.min(stats.todayXp, stats.dailyGoal)}
        aria-valuemax={stats.dailyGoal}
        aria-label={t.goal(stats.todayXp, stats.dailyGoal)}
        title={t.goal(stats.todayXp, stats.dailyGoal)}
      >
        <Target className="size-4" aria-hidden />
      </span>

      <Link
        href="/profile"
        className="flex items-center gap-1 rounded-full px-2 py-1 font-display text-lg font-bold text-warning"
        aria-label={`${t.level(stats.level.level)}, ${t.xp(stats.totalXp)}`}
        title={`${t.level(stats.level.level)} · ${t.xp(stats.totalXp)}`}
      >
        <Star className="size-5" fill="currentColor" aria-hidden />
        {stats.totalXp}
      </Link>

      {profile.avatar_url && (
        <Link href="/profile" className="ml-1 hidden sm:block" aria-label={fr.shell.nav.profile}>
          {/* Avatar Google : petite image externe, next/image n'apporte rien ici. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.avatar_url}
            alt=""
            width={36}
            height={36}
            referrerPolicy="no-referrer"
            className="rounded-full"
          />
        </Link>
      )}
    </div>
  );
}

export function StatsBarSkeleton() {
  return <div className="h-9 w-40 skeleton rounded-full" />;
}
