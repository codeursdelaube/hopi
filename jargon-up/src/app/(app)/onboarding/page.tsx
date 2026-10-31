import { Suspense } from "react";
import { Greeting, GreetingSkeleton } from "@/components/game/Greeting";
import { Mascot } from "@/components/game/Mascot";
import { fr } from "@/lib/i18n/fr";

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <Mascot mood="neutral" size={150} />
      <Suspense fallback={<GreetingSkeleton />}>
        <Greeting />
      </Suspense>
      <p className="text-base-content/70">{fr.shell.onboardingPlaceholder}</p>
    </main>
  );
}
