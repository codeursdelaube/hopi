import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Flame, History, Medal, MessageSquareText, Settings, Star } from "lucide-react";
import { Mascot } from "@/components/game/Mascot";
import { ClearHistoryButton } from "@/components/rooms/ClearHistoryButton";
import { ShareButton } from "@/components/share/ShareDialog";
import { BadgeIcon, LockIcon } from "@/components/ui/icons";
import { requireProfile } from "@/lib/auth/session";
import { can } from "@/lib/features";
import { getHeaderStats } from "@/lib/game/stats";
import { firstName } from "@/lib/push/reminder";
import { loadRoomHistory } from "@/lib/rooms/load";
import { isRoomOpen } from "@/lib/rooms/room";
import { createClient } from "@/lib/supabase/server";
import { fr } from "@/lib/i18n/fr";

const t = fr.profile;

export const metadata: Metadata = { title: t.title };

export default function ProfilePage() {
  return (
    <main className="mx-auto flex w-full app-width flex-1 flex-col gap-6 px-4 py-6">
      <Suspense fallback={<div className="h-[32rem] w-full skeleton" />}>
        <ProfileContent />
      </Suspense>
    </main>
  );
}

async function ProfileContent() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [stats, full, lessons, words, badges, owned] = await Promise.all([
    getHeaderStats(profile),
    supabase.from("profiles").select("longest_streak, created_at").eq("id", profile.id).single(),
    supabase
      .from("lesson_progress")
      .select("lesson_id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .not("completed_at", "is", null),
    supabase
      .from("term_reviews")
      .select("term_id", { count: "exact", head: true })
      .eq("user_id", profile.id),
    // Badges classiques d'abord, puis les badges Premium.
    supabase
      .from("badges")
      .select("id, slug, name_fr, description_fr, icon, premium")
      .order("premium")
      .order("slug"),
    supabase.from("user_badges").select("badge_id").eq("user_id", profile.id),
  ]);

  const ownedIds = new Set((owned.data ?? []).map((b) => b.badge_id));
  const premiumBadges = can(profile.plan, "premium_badges");
  const memberSince = full.data
    ? new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
        new Date(full.data.created_at),
      )
    : null;

  const tiles = [
    { label: t.stats.totalXp, value: stats.totalXp, Icon: Star, tone: "text-warning" },
    { label: t.stats.streak, value: stats.streak, Icon: Flame, tone: "text-secondary" },
    {
      label: t.stats.longest,
      value: full.data?.longest_streak ?? 0,
      Icon: Medal,
      tone: "text-accent",
    },
    { label: t.stats.lessons, value: lessons.count ?? 0, Icon: BookOpen, tone: "text-primary" },
    {
      label: t.stats.words,
      value: words.count ?? 0,
      Icon: MessageSquareText,
      tone: "text-success",
    },
  ];

  return (
    <>
      {/* Tablette : identité et niveau côte à côte. */}
      <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:items-center">
        <section className="flex items-center gap-4">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              width={80}
              height={80}
              referrerPolicy="no-referrer"
              className="rounded-full border-4 border-primary/30"
            />
          ) : (
            <Mascot mood="happy" size={80} />
          )}
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate font-display text-2xl font-bold">{profile.display_name}</h1>
            {memberSince && (
              <p className="text-sm text-base-content/60">{t.memberSince(memberSince)}</p>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-1 rounded-box border-2 border-warning/50 p-4">
          <p className="flex items-center gap-2 font-display text-xl font-bold text-warning">
            <Star className="size-6" fill="currentColor" aria-hidden /> {t.level(stats.level.level)}
          </p>
          <progress
            className="progress h-3 w-full progress-warning"
            value={stats.level.current}
            max={stats.level.needed}
          />
          <p className="text-sm text-base-content/60">
            {t.nextLevel(stats.level.current, stats.level.needed)}
          </p>
        </section>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-box border-2 border-base-300 p-3">
            <p className="flex items-center gap-2 font-display text-2xl font-bold">
              <tile.Icon className={`size-6 ${tile.tone}`} aria-hidden />
              {tile.value}
            </p>
            <p className="text-sm text-base-content/60">{tile.label}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold">{t.badges}</h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {(badges.data ?? []).map((b) => {
            const earned = ownedIds.has(b.id);
            // Badge Premium hors de portée de cette offre : cadenas, lien vers l'offre.
            if (b.premium && !earned && !premiumBadges) {
              return (
                <li key={b.id}>
                  <Link
                    href="/upgrade"
                    aria-label={t.premiumLocked(b.name_fr)}
                    className="relative flex h-full flex-col items-center gap-1 rounded-box border-2 border-dashed border-warning/60 p-3 text-center"
                  >
                    <span className="absolute top-2 right-2 badge gap-1 badge-sm badge-warning">
                      <LockIcon className="size-3" /> {t.premiumBadge}
                    </span>
                    <BadgeIcon slug={b.slug} className="size-10 text-base-content/30" />
                    <span className="font-semibold text-base-content/70">{b.name_fr}</span>
                    <span className="text-xs text-base-content/60">{b.description_fr}</span>
                  </Link>
                </li>
              );
            }
            return (
              <li
                key={b.id}
                className={`flex flex-col items-center gap-1 rounded-box border-2 p-3 text-center ${
                  earned ? "border-warning bg-warning/10" : "border-base-300 opacity-50 grayscale"
                }`}
              >
                <BadgeIcon
                  slug={b.slug}
                  className={`size-10 ${earned ? "text-warning" : "text-base-content/50"}`}
                />
                <span className="font-semibold">{b.name_fr}</span>
                <span className="text-xs text-base-content/70">
                  {earned ? b.description_fr : `${t.locked} · ${b.description_fr}`}
                </span>
                {earned && (
                  <ShareButton
                    title={fr.share.badgeTitle(b.name_fr)}
                    text={fr.share.badgeText(b.name_fr)}
                    path={`/badge/${b.slug}`}
                    className="btn mt-1 btn-ghost btn-xs"
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <Suspense fallback={<div className="h-32 w-full skeleton" />}>
        <RoomHistory userId={profile.id} />
      </Suspense>

      <Link href="/settings" className="btn btn-pop btn-lg">
        <Settings className="size-5" aria-hidden /> {t.settings}
      </Link>
    </>
  );
}

/** Historique des défis (salles Tri express créées ou jouées), avec possibilité de le vider. */
async function RoomHistory({ userId }: { userId: string }) {
  const history = await loadRoomHistory(userId);
  const now = new Date();
  const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
  const r = fr.room;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold">
        <History className="size-6 text-secondary" aria-hidden /> {r.history}
      </h2>
      {history.length === 0 ? (
        <p className="text-sm text-base-content/60">{r.historyEmpty}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {history.map((item) => {
              const open = isRoomOpen(item.endsAt, now);
              return (
                <li key={item.id}>
                  <Link
                    href={`/salle/${item.id}`}
                    className="flex items-center justify-between gap-3 rounded-box border-2 border-base-300 px-3 py-2 hover:bg-base-200"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-semibold">
                        {r.historyHost(firstName(item.creatorName), item.mine)}
                      </span>
                      <span className="text-xs text-base-content/60">
                        {r.historyDate(date.format(item.createdAt))} ·{" "}
                        {open ? r.historyOpen : r.closed}
                      </span>
                    </span>
                    {item.result ? (
                      <span className="flex shrink-0 flex-col items-end text-sm">
                        <span className="font-display font-bold">
                          {item.result.correct}/{item.result.total} ·{" "}
                          {r.historyRank(item.result.rank, item.players)}
                        </span>
                        <span className="flex items-center gap-1 font-bold text-warning">
                          <Star className="size-3.5" fill="currentColor" aria-hidden />{" "}
                          {r.xpWon(item.result.xp)}
                        </span>
                      </span>
                    ) : (
                      <span className="badge shrink-0 badge-ghost">{r.historyNotPlayed}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          <ClearHistoryButton />
        </>
      )}
    </section>
  );
}
