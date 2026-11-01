/**
 * Importe le contenu de src/content/<filière>/units/*.json dans Supabase :
 * unités, leçons, termes et exercices (générés par src/content/generate.ts).
 *
 * Idempotent : relancer met à jour sans dupliquer. Unités et leçons sont reconnues par leur
 * titre anglais (renommer un titre = nouvelle leçon) ; les exercices de chaque leçon sont remplacés.
 *
 * Usage : npm run seed  (Node exécute le TypeScript directement ; variables lues dans .env.local)
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { unitSchema } from "../src/content/schema.ts";
import { generateLessonExercises } from "../src/content/generate.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY doivent être définies (.env.local).",
  );
}

const supabase = createClient(url, secretKey, { auth: { persistSession: false } });
const contentDir = join(import.meta.dirname, "..", "src", "content");

function check<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error || result.data === null) {
    throw new Error(`${what} : ${result.error?.message ?? "aucune donnée"}`);
  }
  return result.data;
}

/**
 * Synchronise des lignes ordonnées (unités d'une filière, leçons d'une unité) en les
 * reconnaissant par leur TITRE anglais : les id sont conservés même si l'ordre change ou si
 * on insère du contenu au milieu, donc la progression des utilisateurs reste sur les bonnes leçons.
 * Ce qui n'existe plus dans les fichiers est supprimé. Renvoie les id dans l'ordre des fichiers.
 */
async function syncOrdered(
  table: "units" | "lessons",
  parentKey: "field_id" | "unit_id",
  parentId: string,
  rows: ({ title_en: string } & Record<string, unknown>)[],
): Promise<string[]> {
  const existing = check(
    await supabase.from(table).select("id, title_en, position").eq(parentKey, parentId),
    `Lecture de ${table}`,
  ) as { id: string; title_en: string; position: number }[];

  // Libère les positions (contrainte unique parent + position) avant de réordonner.
  for (const row of existing) {
    check(
      await supabase
        .from(table)
        .update({ position: 10000 + row.position })
        .eq("id", row.id)
        .select("id"),
      `Décalage de ${table}`,
    );
  }

  const ids: string[] = [];
  for (const [i, row] of rows.entries()) {
    const found = existing.find((e) => e.title_en === row.title_en);
    const values = { ...row, [parentKey]: parentId, position: i + 1 };
    const saved = check(
      found
        ? await supabase.from(table).update(values).eq("id", found.id).select("id").single()
        : await supabase.from(table).insert(values).select("id").single(),
      `Enregistrement de « ${row.title_en} » (${table})`,
    ) as { id: string };
    ids.push(saved.id);
  }

  const stale = existing.filter((e) => !ids.includes(e.id));
  if (stale.length > 0) {
    console.warn(`  ⚠ Supprimé (absent des fichiers) : ${stale.map((e) => e.title_en).join(", ")}`);
    check(
      await supabase
        .from(table)
        .delete()
        .in(
          "id",
          stale.map((e) => e.id),
        )
        .select("id"),
      `Suppression dans ${table}`,
    );
  }
  return ids;
}

const fieldDirs = (await readdir(contentDir, { withFileTypes: true })).filter((d) =>
  d.isDirectory(),
);

for (const fieldDir of fieldDirs) {
  const slug = fieldDir.name;
  const unitsDir = join(contentDir, slug, "units");
  const files = (await readdir(unitsDir)).filter((f) => f.endsWith(".json")).sort();

  const field = check(
    await supabase.from("fields").select("id").eq("slug", slug).single(),
    `Filière « ${slug} » introuvable (migration de référence appliquée ?)`,
  ) as { id: string };

  let lessonCount = 0;
  let termCount = 0;
  let exerciseCount = 0;

  const units = await Promise.all(
    files.map(async (file) =>
      unitSchema.parse(JSON.parse(await readFile(join(unitsDir, file), "utf8"))),
    ),
  );
  const unitIds = await syncOrdered(
    "units",
    "field_id",
    field.id,
    units.map((u) => ({ title_en: u.title_en, title_fr: u.title_fr, level: u.level })),
  );

  for (const [unitIndex, unit] of units.entries()) {
    const lessonIds = await syncOrdered(
      "lessons",
      "unit_id",
      unitIds[unitIndex],
      unit.lessons.map((l) => ({ title_en: l.title_en, xp_reward: l.xp_reward })),
    );

    for (const [lessonIndex, lesson] of unit.lessons.entries()) {
      const savedLesson = { id: lessonIds[lessonIndex] };

      const savedTerms = check(
        await supabase
          .from("terms")
          .upsert(
            lesson.terms.map((t) => ({
              field_id: field.id,
              term: t.term,
              part_of_speech: t.pos,
              definition_en: t.definition_en,
              explanation_fr: t.explanation_fr,
              example_en: t.example_en,
              example_fr: t.example_fr,
              pronunciation_ipa: t.ipa ?? null,
              level: unit.level,
            })),
            { onConflict: "field_id,term" },
          )
          .select("id, term"),
        `Termes de « ${lesson.title_en} »`,
      ) as { id: string; term: string }[];
      const termIds = new Map(savedTerms.map((t) => [t.term, t.id]));
      termCount += savedTerms.length;

      const exercises = generateLessonExercises(lesson).map((ex, i) => ({
        lesson_id: savedLesson.id,
        term_id: ex.term ? (termIds.get(ex.term) ?? null) : null,
        type: ex.type,
        position: i + 1,
        payload: ex.payload,
        explanation_fr: ex.explanation_fr,
      }));

      check(
        await supabase.from("exercises").delete().eq("lesson_id", savedLesson.id).select("id"),
        `Nettoyage des exercices de « ${lesson.title_en} »`,
      );
      check(
        await supabase.from("exercises").insert(exercises).select("id"),
        `Exercices de « ${lesson.title_en} »`,
      );
      exerciseCount += exercises.length;
      lessonCount++;
    }
  }

  // Une filière avec du contenu devient choisissable à l'onboarding.
  check(
    await supabase.from("fields").update({ is_published: true }).eq("id", field.id).select("id"),
    `Publication de la filière « ${slug} »`,
  );

  console.log(
    `✔ ${slug} : ${files.length} unités, ${lessonCount} leçons, ${termCount} termes, ${exerciseCount} exercices (publiée)`,
  );
}
