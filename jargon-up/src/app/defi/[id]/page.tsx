import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Clock, Crown, Rabbit, Swords } from "lucide-react";
import { JoinChallengeButton } from "@/components/challenges/ChallengeButtons";
import { Mascot } from "@/components/game/Mascot";
import { ShareButton } from "@/components/share/ShareDialog";
import {
  MAX_PARTICIPANTS,
  challengeWinner,
  daysLeft,
  isChallengeOver,
} from "@/lib/challenges/challenge";
import { loadChallenge } from "@/lib/challenges/load";
import { firstName } from "@/lib/push/reminder";
import { createClient } from "@/lib/supabase/server";
import { fr } from "@/lib/i18n/fr";

const t = fr.challenge;

/** Aperçu du lien partagé (WhatsApp, Facebook…) : « Koffi te lance un défi ! ». */
export async function generateMetadata({ params }: PageProps<"/defi/[id]">): Promise<Metadata> {
  const { id } = await params;
  const challenge = z.uuid().safeParse(id).success ? await loadChallenge(id) : null;
  const title = challenge ? t.invite(firstName(challenge.creatorName)) : t.pageTitle;
  return { title, description: t.rules, openGraph: { title, description: t.rules } };
}

/** Page publique d'un défi : les amis invités n'ont pas besoin d'être connectés pour la voir. */
export default function ChallengePage({ params }: PageProps<"/defi/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-6 px-4 py-8 text-center">
      <Suspense fallback={<div className="h-96 w-full skeleton" />}>
        <ChallengeContent params={params} />
      </Suspense>
    </main>
  );
}

async function viewerId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

async function ChallengeContent({ params }: Pick<PageProps<"/defi/[id]">, "params">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [challenge, me] = await Promise.all([loadChallenge(id), viewerId()]);

  if (!challenge) {
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
  const over = isChallengeOver(challenge.endsAt, now);
  const isCreator = me === challenge.creatorId;
  const isParticipant = challenge.ranking.some((s) => s.userId === me);
  const full = challenge.ranking.length >= MAX_PARTICIPANTS;
  const winner = over ? challengeWinner(challenge.ranking) : null;

  return (
    <>
      <Mascot mood={over ? "proud" : "happy"} size={130} />
      <div className="flex flex-col gap-2">
        <h1 className="flex items-center justify-center gap-2 font-display text-3xl font-bold">
          <Swords className="size-8 shrink-0 text-secondary" aria-hidden />
          {isCreator ? t.itemMine : t.invite(firstName(challenge.creatorName))}
        </h1>
        <p className="text-base-content/70">{t.rules}</p>
        <p className="mx-auto badge gap-1 badge-lg badge-warning">
          <Clock className="size-4" aria-hidden /> {t.daysLeft(daysLeft(challenge.endsAt, now))}
        </p>
      </div>

      {over && (
        <p className="flex items-center justify-center gap-2 rounded-box bg-warning/15 px-4 py-3 font-semibold">
          <Crown className="size-5 text-warning" aria-hidden />
          {winner ? t.winner(firstName(winner.name) ?? fr.leaderboard.anonymous) : t.noWinner}
        </p>
      )}

      <section className="flex w-full flex-col gap-2 text-left">
        <h2 className="font-display text-lg font-bold">{t.ranking}</h2>
        <ol className="flex flex-col gap-2">
          {challenge.ranking.map((s, i) => {
            const mine = s.userId === me;
            const name = firstName(s.name) ?? fr.leaderboard.anonymous;
            return (
              <li
                key={s.userId}
                aria-label={`${fr.leaderboard.rank(i + 1)} : ${name}, ${fr.leaderboard.xp(s.xp)}`}
                className={`flex items-center gap-3 rounded-box border-2 px-3 py-2 ${
                  mine ? "border-primary bg-primary/10" : "border-base-300"
                }`}
              >
                <span className="w-6 text-center font-display font-bold" aria-hidden>
                  {i + 1}
                </span>
                {s.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.avatarUrl}
                    alt=""
                    width={36}
                    height={36}
                    referrerPolicy="no-referrer"
                    className="rounded-full"
                  />
                ) : (
                  <span className="flex size-9 items-center justify-center rounded-full bg-base-300">
                    <Rabbit className="size-5 text-base-content/60" aria-hidden />
                  </span>
                )}
                <span className="flex-1 truncate font-semibold" aria-hidden>
                  {name}
                  {mine && (
                    <span className="ml-2 badge badge-sm badge-primary">{fr.leaderboard.you}</span>
                  )}
                </span>
                <span className="font-display font-bold text-warning" aria-hidden>
                  {fr.leaderboard.xp(s.xp)}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="flex w-full flex-col gap-3">
        {over ? (
          <Link href={me ? "/leaderboard" : "/login"} className="btn btn-pop btn-lg btn-secondary">
            <Swords className="size-5" aria-hidden /> {t.launchOwn}
          </Link>
        ) : isParticipant ? (
          <>
            <p className="font-semibold text-success">{t.joined}</p>
            <ShareButton
              title={t.shareTitle}
              text={fr.share.challengeText}
              path={`/defi/${challenge.id}`}
              label={t.inviteMore}
              className="btn w-full btn-pop btn-lg btn-secondary"
            />
            <Link href="/learn" className="btn w-full btn-pop btn-lg btn-primary">
              {t.goLearn}
            </Link>
          </>
        ) : full ? (
          <p className="text-base-content/70">{t.full}</p>
        ) : me ? (
          <JoinChallengeButton challengeId={challenge.id} />
        ) : (
          <>
            <Link
              href={`/login?next=${encodeURIComponent(`/defi/${challenge.id}`)}`}
              className="btn w-full btn-pop font-display text-lg btn-lg btn-primary"
            >
              <Swords className="size-5" aria-hidden /> {t.accept}
            </Link>
            <p className="text-sm text-base-content/60">{t.newcomer}</p>
          </>
        )}
      </div>
    </>
  );
}
