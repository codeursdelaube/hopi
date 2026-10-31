import type { Level } from "@/types/database";

export const LEVELS = ["A2", "B1", "B2"] as const satisfies readonly Level[];

/** Objectifs quotidiens proposés à l'onboarding (en XP). */
export const DAILY_GOALS = [10, 20, 30, 50] as const;
export type DailyGoal = (typeof DAILY_GOALS)[number];
