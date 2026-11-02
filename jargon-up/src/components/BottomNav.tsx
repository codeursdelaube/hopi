"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { fr } from "@/lib/i18n/fr";
import { Brain, House, Trophy, UserRound } from "lucide-react";

const ITEMS = [
  { href: "/learn", icon: House, label: fr.shell.nav.learn },
  { href: "/review", icon: Brain, label: fr.shell.nav.review },
  { href: "/leaderboard", icon: Trophy, label: fr.shell.nav.leaderboard },
  { href: "/profile", icon: UserRound, label: fr.shell.nav.profile },
] as const;

/** Barre de navigation du bas (zones tactiles ≥ 44 px). */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label={fr.shell.mainNav}
      className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-base-300 bg-base-100 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex app-width justify-around">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`mx-1 my-1.5 flex min-h-12 flex-col items-center justify-center rounded-field border-2 text-xs font-bold ${
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-transparent text-base-content/60 hover:bg-base-200"
                }`}
              >
                <item.icon className="size-6" strokeWidth={active ? 2.5 : 2} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
