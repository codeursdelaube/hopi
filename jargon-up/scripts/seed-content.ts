/**
 * Importe le contenu de src/content/<filière>/units/*.json dans Supabase :
 * unités, leçons, termes et exercices (générés par src/content/generate.ts).
 *
 * Idempotent : relancer met à jour sans dupliquer (upsert sur les positions et les termes ;
 * les exercices de chaque leçon sont remplacés).
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

  for (const [unitIndex, file] of files.entries()) {
    const unit = unitSchema.parse(JSON.parse(await readFile(join(unitsDir, file), "utf8")));

    const savedUnit = check(
      await supabase
        .from("units")
        .upsert(
          {
            field_id: field.id,
            position: unitIndex + 1,
            level: unit.level,
            title_en: unit.title_en,
            title_fr: unit.title_fr,
          },
          { onConflict: "field_id,position" },
        )
        .select("id")
        .single(),
      `Unité ${file}`,
    ) as { id: string };

    for (const [lessonIndex, lesson] of unit.lessons.entries()) {
      const savedLesson = check(
        await supabase
          .from("lessons")
          .upsert(
            {
              unit_id: savedUnit.id,
              position: lessonIndex + 1,
              title_en: lesson.title_en,
              xp_reward: lesson.xp_reward,
            },
            { onConflict: "unit_id,position" },
          )
          .select("id")
          .single(),
        `Leçon « ${lesson.title_en} »`,
      ) as { id: string };

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
