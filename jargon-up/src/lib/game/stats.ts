import "server-only";
import type { Profile } from "@/lib/auth/session";
import { localDate, localDayStart } from "@/lib/gamification/dates";
import { levelProgress, type LevelProgress } from "@/lib/gamification/levels";
import { effectiveStreak } from "@/lib/gamification/streak";
import { createClient } from "@/lib/supabase/server";
import { getUserOffset } from "@/lib/tz";

export type HeaderStats = {
  streak: number;
  goalDoneToday: boolean;
  totalXp: number;
  level: LevelProgress;
  todayXp: number;
  dailyGoal: number;
};

/** Statistiques affichées dans la barre du haut. */
export async function getHeaderStats(profile: Profile): Promise<HeaderStats> {
  const offset = await getUserOffset();
  const now = new Date();
  const today = localDate(now, offset);
  const supabase = await createClient();

  const [{ data: full }, { data: events }] = await Promise.all([
    supabase
      .from("profiles")
      .select("current_streak, longest_streak, last_activity_date")
      .eq("id", profile.id)
      .single(),
    supabase
      .from("xp_events")
      .select("amount")
      .eq("user_id", profile.id)
      .gte("created_at", localDayStart(now, offset).toISOString()),
  ]);

  const streakState = {
    currentStreak: full?.current_streak ?? 0,
    longestStreak: full?.longest_streak ?? 0,
    lastActivityDate: full?.last_activity_date ?? null,
  };

  return {
    streak: effectiveStreak(streakState, today),
    goalDoneToday: streakState.lastActivityDate === today,
    totalXp: profile.total_xp,
    level: levelProgress(profile.total_xp),
    todayXp: (events ?? []).reduce((s, e) => s + e.amount, 0),
    dailyGoal: profile.daily_goal_xp,
  };
}
