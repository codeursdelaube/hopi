import { Suspense } from "react";
import Link from "next/link";
import { requireProfile } from "@/lib/auth/session";
import { fr } from "@/lib/i18n/fr";

/** Coquille des pages connectées. La barre XP / série arrive en Phase 4. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="navbar border-b-2 border-base-300 px-4">
        <Link href="/learn" className="flex-1 font-display text-xl font-bold text-primary">
          {fr.app.name}
        </Link>
        <Suspense fallback={<div className="size-9 skeleton rounded-full" />}>
          <UserMenu />
        </Suspense>
      </header>
      {children}
    </div>
  );
}

async function UserMenu() {
  const profile = await requireProfile();

  return (
    <div className="flex items-center gap-2">
      {profile.avatar_url && (
        // Avatar Google : petite image externe, next/image n'apporte rien ici.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatar_url}
          alt=""
          width={36}
          height={36}
          referrerPolicy="no-referrer"
          className="rounded-full"
        />
      )}
      <form action="/auth/signout" method="post">
        <button type="submit" className="btn min-h-11 btn-ghost btn-sm">
          {fr.auth.signOut}
        </button>
      </form>
    </div>
  );
}
