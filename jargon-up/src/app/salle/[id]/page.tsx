import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Check, Clock, Medal, Shuffle, Star, Timer, Users, X } from "lucide-react";
import { Mascot } from "@/components/game/Mascot";
import { Lobby } from "@/components/rooms/Lobby";
import { PlayerAvatar } from "@/components/rooms/PlayerAvatar";
import { JoinRoomButton } from "@/components/rooms/RoomButtons";
import { RoomRefresher } from "@/components/rooms/RoomRefresher";
import { SortGame } from "@/components/rooms/SortGame";
import { requireProfile } from "@/lib/auth/session";
import { firstName } from "@/lib/push/reminder";
import { loadRoom, type RoomView } from "@/lib/rooms/load";
import {
  ROOM,
  formatDuration,
  formatLimit,
  isGameRunning,
  isRoomOpen,
  minutesLeft,
  publicPuzzle,
} from "@/lib/rooms/room";
import { createClient } from "@/lib/supabase/server";
import { fr } from "@/lib/i18n/fr";

const t = fr.room;
/** Couleurs des médailles : or, argent, bronze. */
const MEDALS = ["text-warning", "text-base-content/50", "text-secondary"];

/** Aperçu du lien partagé : « Koffi t'invite au Tri express ! ». */
export async function generateMetadata({ params }: PageProps<"/salle/[id]">): Promise<Metadata> {
  const { id } = await params;
  const room = z.uuid().safeParse(id).success ? await loadRoom(id, null) : null;
  const title = room ? t.invite(firstName(room.creatorName)) : t.name;
  return { title, description: t.rules, openGraph: { title, description: t.rules } };
}

/** Page publique d'une salle « Tri express ». */
export default function RoomPage({ params }: PageProps<"/salle/[id]">) {
  return (
    <main className="mx-auto flex w-full play-width flex-1 flex-col items-center gap-6 px-4 py-8 text-center">
      <Suspense fallback={<div className="h-96 w-full skeleton" />}>
        <RoomContent params={params} />
      </Suspense>
    </main>
  );
}

async function viewerId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

async function RoomContent({ params }: Pick<PageProps<"/salle/[id]">, "params">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const me = await viewerId();
  const room = await loadRoom(id, me);

  if (!room) {
    return (
      <>
        <Mascot mood="sad" size={140} />
        <p>{t.notFound}</p>
        <Link href="/" className="btn btn-pop btn-primary">
          {fr.app.name}
        </Link>
      </>
    );
  }

  const now = new Date();
  const open = isRoomOpen(room.endsAt, now);
  const finished = room.me?.finishedAt;
  const isHost = me === room.creatorId;

  // Partie lancée : le jeu prend toute la place (compte à rebours commun, puis les mots).
  if (room.startedAt && room.me && !finished) {
    const profile = await requireProfile();
    return (
      <>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <Shuffle className="size-7 text-accent" aria-hidden /> {t.name}
        </h1>
        <SortGame
          roomId={room.id}
          puzzle={publicPuzzle(room.puzzle)}
          startedAt={room.me.startedAt.toISOString()}
          serverNow={now.toISOString()}
          timeLimitSeconds={room.timeLimitSeconds}
          soundEnabled={profile.sound_enabled}
        />
      </>
    );
  }

  const header = (
    <>
      <Mascot mood={finished ? "proud" : "happy"} size={120} />
      <div className="flex flex-col gap-2">
        <h1 className="flex items-center justify-center gap-2 font-display text-3xl font-bold">
          <Shuffle className="size-8 shrink-0 text-accent" aria-hidden />
          {isHost ? t.itemMine : t.invite(firstName(room.creatorName))}
        </h1>
        <p className="text-base-content/70">{t.rules}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <span className="badge gap-1 badge-lg badge-warning">
            <Clock className="size-4" aria-hidden />{" "}
            {room.startedAt
              ? t.launched
              : open
                ? t.timeLeft(minutesLeft(room.endsAt, now))
                : t.closed}
          </span>
          <span className="badge gap-1 badge-lg badge-accent">
            <Timer className="size-4" aria-hidden />{" "}
            {t.timeLimitBadge(formatLimit(room.timeLimitSeconds))}
          </span>
          <span className="badge gap-1 badge-ghost badge-lg">
            <Users className="size-4" aria-hidden /> {t.players(room.playerCount)}
          </span>
        </div>
      </div>
    </>
  );

  // Salle d'attente : la liste des joueurs se met à jour toute seule, et le lancement de
  // l'hôte fait basculer chaque téléphone dans le jeu.
  if (!room.startedAt && open && room.me && me) {
    return (
      <>
        {header}
        <RoomRefresher intervalMs={ROOM.lobbyRefreshMs} />
        <Lobby
          roomId={room.id}
          meId={me}
          hostId={room.creatorId}
          hostName={firstName(room.creatorName) ?? fr.leaderboard.anonymous}
          players={room.players.map((p) => ({
            ...p,
            name: firstName(p.name) ?? fr.leaderboard.anonymous,
          }))}
        />
      </>
    );
  }

  // Tant que des joueurs peuvent finir, le classement se met à jour tout seul.
  const othersPlaying =
    room.startedAt !== null &&
    room.ranking.length < room.playerCount &&
    isGameRunning(room.startedAt, room.timeLimitSeconds, now);

  return (
    <>
      {header}
      {othersPlaying && <RoomRefresher intervalMs={ROOM.resultsRefreshMs} />}

      {finished && room.me ? <MyResult room={room} /> : null}

      <div className="flex w-full flex-col gap-3">
        {finished ? (
          <Link href="/leaderboard" className="btn w-full btn-pop btn-lg">
            {t.createOwn}
          </Link>
        ) : room.startedAt ? (
          <p className="text-base-content/70">{t.alreadyStarted}</p>
        ) : !open ? (
          <p className="text-base-content/70">{t.expired}</p>
        ) : room.playerCount >= ROOM.maxPlayers ? (
          <p className="text-base-content/70">{t.full}</p>
        ) : me ? (
          <>
            <p className="text-sm text-base-content/60">{t.xpRule}</p>
            <JoinRoomButton roomId={room.id} />
          </>
        ) : (
          <>
            <Link
              href={`/login?next=${encodeURIComponent(`/salle/${room.id}`)}`}
              className="btn w-full btn-pop font-display text-lg btn-lg btn-primary"
            >
              {t.login}
            </Link>
            <p className="text-sm text-base-content/60">{t.newcomer}</p>
          </>
        )}
      </div>

      {room.startedAt && <Ranking room={room} me={me} />}
    </>
  );
}

/** Score, temps, XP et correction terme par terme. */
function MyResult({ room }: { room: RoomView }) {
  const mine = room.me!;
  const placements = mine.placements ?? {};
  // Réponses justes mais score à 0 : la réponse est arrivée après le temps limite.
  const rightAnswers = room.puzzle.terms.filter(
    (term) => placements[term.id] === term.conceptId,
  ).length;
  const late = mine.correct === 0 && rightAnswers > 0;
  return (
    <section className="flex w-full flex-col gap-4 rounded-box border-2 border-success/50 bg-success/5 p-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t.scoreLabel} value={`${mine.correct}/${mine.total}`} />
        <Stat label={t.time} value={formatDuration(mine.durationMs ?? 0)} />
        <Stat label="XP" value={t.xpWon(mine.xp ?? 0)} />
      </div>

      {late && (
        <p role="status" className="font-semibold text-error">
          {t.late}
        </p>
      )}

      <div className="flex flex-col gap-3 text-left">
        <h2 className="font-display text-lg font-bold">{t.correction}</h2>
        {room.puzzle.concepts.map((concept) => (
          <div key={concept.id} className="flex flex-col gap-1">
            <h3 lang="en" className="font-bold">
              {concept.label}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {room.puzzle.terms
                .filter((term) => term.conceptId === concept.id)
                .map((term) => {
                  const ok = placements[term.id] === concept.id;
                  return (
                    <li
                      key={term.id}
                      lang="en"
                      className={`badge gap-1 badge-lg ${ok ? "badge-success" : "badge-error"}`}
                    >
                      {ok ? (
                        <Check className="size-4" strokeWidth={3} aria-label="juste" />
                      ) : (
                        <X className="size-4" strokeWidth={3} aria-label="faux" />
                      )}
                      {term.term}
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-box bg-base-100 p-2">
      <span className="font-display text-lg font-bold whitespace-nowrap sm:text-xl">{value}</span>
      <span className="text-xs text-base-content/60">{label}</span>
    </div>
  );
}

function Ranking({ room, me }: { room: RoomView; me: string | null }) {
  return (
    <section className="flex w-full flex-col gap-2 text-left">
      <h2 className="font-display text-lg font-bold">{t.ranking}</h2>
      {room.ranking.length === 0 ? (
        <p className="text-sm text-base-content/60">{t.noRanking}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {room.ranking.map((r, i) => {
            const mine = r.userId === me;
            const name = firstName(r.name) ?? fr.leaderboard.anonymous;
            return (
              <li
                key={r.userId}
                aria-label={`${fr.leaderboard.rank(i + 1)} : ${name}, ${t.result(r.correct, r.total)}, ${formatDuration(r.durationMs)}`}
                className={`flex items-center gap-3 rounded-box border-2 px-3 py-2 ${
                  mine ? "border-primary bg-primary/10" : "border-base-300"
                }`}
              >
                <span className="w-7 text-center font-display font-bold" aria-hidden>
                  {MEDALS[i] ? <Medal className={`mx-auto size-6 ${MEDALS[i]}`} /> : i + 1}
                </span>
                <PlayerAvatar url={r.avatarUrl} />
                <span className="min-w-0 flex-1 truncate font-semibold" aria-hidden>
                  {name}
                  {mine && <span className="ml-2 badge badge-sm badge-primary">{t.you}</span>}
                </span>
                <span className="flex flex-col items-end text-sm" aria-hidden>
                  <span className="font-display font-bold">
                    {r.correct}/{r.total} · {formatDuration(r.durationMs)}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-warning">
                    <Star className="size-3.5" fill="currentColor" /> {t.xpWon(r.xp)}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
