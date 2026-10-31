import Link from "next/link";
import { Mascot } from "@/components/game/Mascot";
import { fr } from "@/lib/i18n/fr";

/** Provisoire : le moteur d'exercices arrive en Phase 3. */
export default function LessonPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <Mascot mood="neutral" size={140} />
      <p className="text-base-content/70">{fr.lesson.placeholder}</p>
      <Link href="/learn" className="btn btn-pop btn-primary">
        {fr.lesson.backToPath}
      </Link>
    </main>
  );
}
