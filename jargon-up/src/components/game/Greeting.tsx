import { requireProfile } from "@/lib/auth/session";
import { fr } from "@/lib/i18n/fr";

/** « Salut Koffi ! » — lit le profil, donc à placer sous un <Suspense>. */
export async function Greeting() {
  const profile = await requireProfile();
  const name = profile.display_name?.split(" ")[0] ?? "";
  return <h1 className="font-display text-3xl font-bold">{fr.shell.hello(name)}</h1>;
}

export function GreetingSkeleton() {
  return <div className="h-9 w-48 skeleton" />;
}
