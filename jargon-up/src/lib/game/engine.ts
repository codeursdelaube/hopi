import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDate, localDayStart } from "@/lib/gamification/dates";
import { levelFromXp } from "@/lib/gamification/levels";
import { registerGoalReached } from "@/lib/gamification/streak";
import { INITIAL_REVIEW_STATE, nextReviewAt, qualityFromResult, sm2 } from "@/lib/srs/sm2";
import type { EarnedBadge, GameSummary } from "@/lib/game/types";
import type { XpSource } from "@/types/database";

/**
 * Toutes les écritures « de jeu » (XP, série, badges, révisions) passent par ici,
 * côté serveur, avec la clé secrète. Les appelants DOIVENT avoir vérifié l'utilisateur.
 *
 * Note : les mises à jour du profil se font en lecture-puis-écriture ; deux requêtes
 * strictement simultanées du même utilisateur pourraient se chevaucher (risque accepté pour le MVP).
 */

type AwardInput = {
  userId: string;
  amount: number;
  source: XpSource;
  offsetMinutes: number;
  /** Indices pour les badges ponctuels. */
  perfectLesson?: boolean;
};

export async function xpEarnedToday(
  userId: string,
  offsetMinutes: number,
  source?: XpSource,
): Promise<number> {
  const admin = createAdminClient();
  let query = admin
    .from("xp_events")
    .select("amount")
    .eq("user_id", userId)
    .gte("created_at", localDayStart(new Date(), offsetMinutes).toISOString());
  if (source) query = query.eq("source", source);
  const { data, error } = await query;
  if (error) throw new Error(`Lecture des XP du jour : ${error.message}`);
  return data.reduce((sum, e) => sum + e.amount, 0);
}

export async function awardXp(input: AwardInput): Promise<GameSummary> {
  const admin = createAdminClient();
  const now = new Date();
  const today = localDate(now, input.offsetMinutes);

  const { data: profile, error } = await admin
    .from("profiles")
    .select("total_xp, daily_goal_xp, current_streak, longest_streak, last_activity_date")
    .eq("id", input.userId)
    .single();
  if (error) throw new Error(`Lecture du profil : ${error.message}`);

  const amount = Math.max(0, Math.round(input.amount));
  if (amount > 0) {
    const { error: insertError } = await admin
      .from("xp_events")
      .insert({ user_id: input.userId, amount, source: input.source });
    if (insertError) throw new Error(`Enregistrement des XP : ${insertError.message}`);
  }

  const todayXp = await xpEarnedToday(input.userId, input.offsetMinutes);
  const totalXp = profile.total_xp + amount;

  let streak = {
    currentStreak: profile.current_streak,
    longestStreak: profile.longest_streak,
    lastActivityDate: profile.last_activity_date,
  };
  let streakIncreased = false;
  if (todayXp >= profile.daily_goal_xp) {
    const next = registerGoalReached(streak, today);
    streakIncreased = next.increased;
    streak = next;
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      total_xp: totalXp,
      current_streak: streak.currentStreak,
      longest_streak: streak.longestStreak,
      last_activity_date: streak.lastActivityDate,
    })
    .eq("id", input.userId);
  if (updateError) throw new Error(`Mise à jour du profil : ${updateError.message}`);

  const newBadges = await grantBadges(input.userId, {
    totalXp,
    streak: streak.currentStreak,
    perfectLesson: input.perfectLesson ?? false,
  });

  return {
    xpGained: amount,
    totalXp,
    levelBefore: levelFromXp(profile.total_xp),
    levelAfter: levelFromXp(totalXp),
    todayXp,
    dailyGoal: profile.daily_goal_xp,
    streak: streak.currentStreak,
    streakIncreased,
    newBadges,
  };
}

/** Attribue les badges mérités et pas encore obtenus. */
async function grantBadges(
  userId: string,
  facts: { totalXp: number; streak: number; perfectLesson: boolean },
): Promise<EarnedBadge[]> {
  const admin = createAdminClient();

  const [{ data: badges }, { data: owned }, { count: lessonsDone }, { data: reviewEvents }] =
    await Promise.all([
      admin.from("badges").select("id, slug, name_fr, icon"),
      admin.from("user_badges").select("badge_id").eq("user_id", userId),
      admin
        .from("lesson_progress")
        .select("lesson_id", { count: "exact", head: true })
        .eq("user_id", userId)
        .not("completed_at", "is", null),
      admin.from("xp_events").select("amount").eq("user_id", userId).eq("source", "review"),
    ]);
  if (!badges) return [];

  const reviewedTerms = (reviewEvents ?? []).reduce((s, e) => s + e.amount, 0);
  const earned: Record<string, boolean> = {
    first_lesson: (lessonsDone ?? 0) >= 1,
    perfect: facts.perfectLesson,
    xp_100: facts.totalXp >= 100,
    xp_1000: facts.totalXp >= 1000,
    streak_3: facts.streak >= 3,
    streak_7: facts.streak >= 7,
    streak_30: facts.streak >= 30,
    reviewer: reviewedTerms >= 50,
  };

  const ownedIds = new Set((owned ?? []).map((o) => o.badge_id));
  const toGrant = badges.filter((b) => earned[b.slug] && !ownedIds.has(b.id));
  if (toGrant.length === 0) return [];

  const { error } = await admin.from("user_badges").upsert(
    toGrant.map((b) => ({ user_id: userId, badge_id: b.id })),
    { onConflict: "user_id,badge_id", ignoreDuplicates: true },
  );
  if (error) throw new Error(`Attribution des badges : ${error.message}`);
  return toGrant.map(({ slug, name_fr, icon }) => ({ slug, name_fr, icon }));
}

/** Met à jour la répétition espacée (SM-2) de plusieurs termes. */
export async function recordTermResults(
  userId: string,
  results: { termId: string; correct: boolean }[],
): Promise<void> {
  if (results.length === 0) return;
  const admin = createAdminClient();
  const termIds = [...new Set(results.map((r) => r.termId))];

  const { data: existing, error } = await admin
    .from("term_reviews")
    .select("term_id, ease_factor, interval_days, repetitions")
    .eq("user_id", userId)
    .in("term_id", termIds);
  if (error) throw new Error(`Lecture des révisions : ${error.message}`);

  const byTerm = new Map(existing.map((r) => [r.term_id, r]));
  // Un terme raté au moins une fois compte comme raté.
  const correctByTerm = new Map<string, boolean>();
  for (const r of results) {
    correctByTerm.set(r.termId, (correctByTerm.get(r.termId) ?? true) && r.correct);
  }

  const now = new Date();
  const rows = termIds.map((termId) => {
    const prev = byTerm.get(termId);
    const state = prev
      ? {
          easeFactor: Number(prev.ease_factor),
          intervalDays: prev.interval_days,
          repetitions: prev.repetitions,
        }
      : INITIAL_REVIEW_STATE;
    const correct = correctByTerm.get(termId) ?? false;
    const next = sm2(state, qualityFromResult(correct));
    return {
      user_id: userId,
      term_id: termId,
      ease_factor: next.easeFactor,
      interval_days: next.intervalDays,
      repetitions: next.repetitions,
      next_review_at: nextReviewAt(now, next.intervalDays).toISOString(),
      last_result: correct,
    };
  });

  const { error: upsertError } = await admin
    .from("term_reviews")
    .upsert(rows, { onConflict: "user_id,term_id" });
  if (upsertError) throw new Error(`Enregistrement des révisions : ${upsertError.message}`);
}
