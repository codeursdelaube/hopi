import type { Level } from "@/types/database";

export type LessonState = "completed" | "current" | "available" | "locked";

export type PathUnitInput = {
  id: string;
  level: Level;
  title_en: string;
  title_fr: string;
  lessons: { id: string; title_en: string; xp_reward: number }[];
};

export type PathLesson = PathUnitInput["lessons"][number] & { state: LessonState };

export type PathUnit = Omit<PathUnitInput, "lessons"> & {
  lessons: PathLesson[];
  completedCount: number;
  /** Unité d'un niveau inférieur à celui de l'utilisateur : jouable librement, pas obligatoire. */
  skipped: boolean;
};

const LEVEL_RANK: Record<Level, number> = { A2: 0, B1: 1, B2: 2 };

/**
 * Calcule l'état de chaque leçon du parcours (unités et leçons déjà triées).
 *
 * - Les leçons terminées sont `completed` (rejouables).
 * - Les unités sous le niveau de l'utilisateur sont `available` : il peut les faire, sans obligation.
 * - La première leçon non terminée (hors unités sautées) est `current` ; tout ce qui suit est `locked`.
 * - Si tout est terminé à son niveau, la `current` devient la première leçon restante d'une unité sautée.
 */
export function buildPath(
  units: PathUnitInput[],
  completedLessonIds: ReadonlySet<string>,
  userLevel: Level,
): PathUnit[] {
  const isSkipped = (u: PathUnitInput) => LEVEL_RANK[u.level] < LEVEL_RANK[userLevel];
  const ordered = units.flatMap((u) =>
    u.lessons.map((l) => ({ lesson: l, skipped: isSkipped(u) })),
  );

  const current =
    ordered.find((x) => !x.skipped && !completedLessonIds.has(x.lesson.id)) ??
    ordered.find((x) => !completedLessonIds.has(x.lesson.id));
  const currentId = current?.lesson.id ?? null;

  return units.map((unit) => {
    const skipped = isSkipped(unit);
    const lessons = unit.lessons.map((lesson): PathLesson => {
      let state: LessonState;
      if (completedLessonIds.has(lesson.id)) state = "completed";
      else if (lesson.id === currentId) state = "current";
      else if (skipped) state = "available";
      else state = "locked";
      return { ...lesson, state };
    });
    return {
      ...unit,
      lessons,
      skipped,
      completedCount: lessons.filter((l) => l.state === "completed").length,
    };
  });
}
