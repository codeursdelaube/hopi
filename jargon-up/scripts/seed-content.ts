/**
 * Importe le contenu de src/content/<filière>/course.json dans Supabase.
 * Idempotent : relancer met à jour sans dupliquer (upsert sur les positions).
 *
 * Usage : npm run seed
 * (exécuté directement par Node, qui retire les types TypeScript ; variables lues dans .env.local)
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { courseSchema } from "../src/content/schema.ts";

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

const folders = (await readdir(contentDir, { withFileTypes: true })).filter((d) => d.isDirectory());

for (const folder of folders) {
  const raw = JSON.parse(await readFile(join(contentDir, folder.name, "course.json"), "utf8"));
  const course = courseSchema.parse(raw);

  const field = check(
    await supabase.from("fields").select("id").eq("slug", course.field).single(),
    `Filière « ${course.field} » introuvable (migration de référence appliquée ?)`,
  ) as { id: string };

  let lessonCount = 0;
  for (const [unitIndex, unit] of course.units.entries()) {
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
      `Unité ${unitIndex + 1}`,
    ) as { id: string };

    const lessons = unit.lessons.map((lesson, i) => ({
      unit_id: savedUnit.id,
      position: i + 1,
      title_en: lesson.title_en,
      xp_reward: lesson.xp_reward,
    }));
    check(
      await supabase
        .from("lessons")
        .upsert(lessons, { onConflict: "unit_id,position" })
        .select("id"),
      `Leçons de l'unité ${unitIndex + 1}`,
    );
    lessonCount += lessons.length;
  }

  console.log(`✔ ${course.field} : ${course.units.length} unités, ${lessonCount} leçons`);
}
