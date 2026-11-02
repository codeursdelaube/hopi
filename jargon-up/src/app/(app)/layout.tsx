import { Suspense } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { PresencePing } from "@/components/PresencePing";
import { NotificationPrompt } from "@/components/pwa/NotificationPrompt";
import { StatsBar, StatsBarSkeleton } from "@/components/game/StatsBar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { fr } from "@/lib/i18n/fr";

/** Coquille des pages connectées : barre de stats en haut, navigation en bas. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col pb-20">
      <header className="sticky top-0 z-20 border-b-2 border-base-300 bg-base-100/95 backdrop-blur">
        <div className="mx-auto flex h-14 app-width items-center justify-between px-4">
          <Link href="/learn" className="font-display text-xl font-bold text-primary">
            {fr.app.name}
          </Link>
          <div className="flex items-center">
            <Suspense fallback={<StatsBarSkeleton />}>
              <StatsBar />
            </Suspense>
            <ThemeToggle className="btn-sm" />
          </div>
        </div>
      </header>
      {children}
      <BottomNav />
      <PresencePing />
      <NotificationPrompt />
    </div>
  );
}
