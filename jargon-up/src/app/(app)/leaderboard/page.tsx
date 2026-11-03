import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CreateRoomButton } from "@/components/rooms/RoomButtons";
import { Mascot } from "@/components/game/Mascot";
import { requireProfile } from "@/lib/auth/session";
import { loadActiveRooms } from "@/lib/rooms/load";
import { minutesLeft } from "@/lib/rooms/room";
import { firstName } from "@/lib/push/reminder";
import { createClient } from "@/lib/supabase/server";
import { fr } from "@/lib/i18n/fr";
import { Medal, Rabbit, Swords, Trophy } from "lucide-react";

const t = fr.leaderboard;
const r = fr.room;
/** Couleurs des médailles : or, argent, bronze. */
const MEDALS = ["text-warning", "text-base-content/50", "text-secondary"];

export const metadata: Metadata = { title: fr.shell.nav.leaderboard };

export default function LeaderboardPage() {
  return (
    <main className="mx-auto flex w-full app-width flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex items-center gap-3">
        <Trophy className="size-12 shrink-0 text-warning" aria-hidden />
        <div>
          <h1 className="font-display text-2xl font-bold">{t.title}</h1>
          <p className="text-sm text-base-content/60">{t.subtitle}</p>
        </div>
      </div>
      {/* Grande tablette : défis entre amis à gauche (restent visibles), classement à droite. */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-6">
        <section className="flex flex-col gap-3 rounded-box border-2 border-secondary/50 bg-secondary/5 p-4 lg:sticky lg:top-20">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <Swords className="size-6 text-secondary" aria-hidden /> {r.cardTitle}
          </h2>
          <p className="text-sm text-base-content/70">{r.cardText}</p>
          <CreateRoomButton />
          <Suspense fallback={null}>
            <ActiveRooms />
          </Suspense>
        </section>
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
      </div>
    </main>
  );
}

/** Salles « Tri express » encore ouvertes de l'utilisateur. */
async function ActiveRooms() {
  const profile = await requireProfile();
  const rooms = await loadActiveRooms(profile.id);
  if (rooms.length === 0) return null;
  const now = new Date();

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-bold text-base-content/70">{r.active}</h3>
      <ul className="flex flex-col gap-2">
        {rooms.map((room) => (
          <li key={room.id}>
            <Link
              href={`/salle/${room.id}`}
              className="flex items-center justify-between gap-2 rounded-box border-2 border-base-300 bg-base-100 px-3 py-2"
            >
              <span className="truncate font-semibold">
                {room.mine ? r.itemMine : r.item(firstName(room.creatorName))}
              </span>
              <span className="badge shrink-0 badge-sm badge-warning">
                {r.timeLeft(minutesLeft(room.endsAt, now))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
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
            {MEDALS[i] ? <Medal className={`mx-auto size-7 ${MEDALS[i]}`} /> : i + 1}
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
              <Rabbit className="size-5 text-base-content/60" aria-hidden />
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
