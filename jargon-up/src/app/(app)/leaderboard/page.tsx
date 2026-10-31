import { Suspense } from "react";
import type { Metadata } from "next";
import { Mascot } from "@/components/game/Mascot";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fr } from "@/lib/i18n/fr";

const t = fr.leaderboard;
const MEDALS = ["🥇", "🥈", "🥉"];

export const metadata: Metadata = { title: fr.shell.nav.leaderboard };

export default function LeaderboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center gap-3">
        <span className="text-5xl" aria-hidden>
          🏆
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">{t.title}</h1>
          <p className="text-sm text-base-content/60">{t.subtitle}</p>
        </div>
      </div>
      <Suspense
        fallback={
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 w-full skeleton" />
            ))}
          </div>
        }
      >
        <Ranking />
      </Suspense>
    </main>
  );
}

async function Ranking() {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("weekly_leaderboard", { limit_count: 50 });
  if (error) throw new Error(`Chargement du classement : ${error.message}`);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Mascot mood="neutral" size={120} />
        <p>{t.empty}</p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {data.map((row, i) => (
        <li
          key={i}
          aria-label={`${t.rank(i + 1)} : ${row.display_name ?? t.anonymous}, ${t.xp(row.weekly_xp)}`}
          className={`flex items-center gap-3 rounded-box border-2 px-3 py-2 ${
            row.is_me ? "border-primary bg-primary/10" : "border-base-300"
          }`}
        >
          <span className="w-8 text-center font-display text-lg font-bold" aria-hidden>
            {MEDALS[i] ?? i + 1}
          </span>
          {row.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.avatar_url}
              alt=""
              width={40}
              height={40}
              referrerPolicy="no-referrer"
              className="rounded-full"
            />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-full bg-base-300">
              🐰
            </span>
          )}
          <span className="flex-1 truncate font-semibold" aria-hidden>
            {row.display_name ?? t.anonymous}
            {row.is_me && <span className="ml-2 badge badge-sm badge-primary">{t.you}</span>}
          </span>
          <span className="font-display font-bold text-warning" aria-hidden>
            {t.xp(row.weekly_xp)}
          </span>
        </li>
      ))}
    </ol>
  );
}
