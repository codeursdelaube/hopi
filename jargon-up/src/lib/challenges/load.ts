import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { rankScores, type ChallengeScore } from "@/lib/challenges/challenge";

export type ChallengeView = {
  id: string;
  creatorId: string;
  creatorName: string | null;
  createdAt: Date;
  endsAt: Date;
  /** Participants classés (plus d'XP d'abord). */
  ranking: ChallengeScore[];
};

/**
 * Défi et son classement. Lu avec la clé secrète : la page du défi est publique (les amis
 * invités ne sont pas forcément connectés) et n'affiche que prénoms, avatars et XP du défi.
 */
export async function loadChallenge(id: string): Promise<ChallengeView | null> {
  const admin = createAdminClient();
  const [{ data: challenge, error }, { data: scores, error: scoresError }] = await Promise.all([
    admin
      .from("challenges")
      .select("id, creator_id, created_at, ends_at")
      .eq("id", id)
      .maybeSingle(),
    admin.rpc("challenge_scores", { p_challenge_id: id }),
  ]);
  if (error) throw new Error(`Chargement du défi : ${error.message}`);
  if (scoresError) throw new Error(`Classement du défi : ${scoresError.message}`);
  if (!challenge) return null;

  const ranking = rankScores(
    scores.map((s) => ({
      userId: s.user_id,
      name: s.display_name,
      avatarUrl: s.avatar_url,
      xp: Number(s.xp),
      joinedAt: new Date(s.joined_at),
    })),
  );

  return {
    id: challenge.id,
    creatorId: challenge.creator_id,
    creatorName: ranking.find((s) => s.userId === challenge.creator_id)?.name ?? null,
    createdAt: new Date(challenge.created_at),
    endsAt: new Date(challenge.ends_at),
    ranking,
  };
}

export type ActiveChallenge = {
  id: string;
  creatorName: string | null;
  endsAt: Date;
  mine: boolean;
};

/** Défis en cours auxquels l'utilisateur participe (les plus proches de la fin d'abord). */
export async function loadActiveChallenges(userId: string): Promise<ActiveChallenge[]> {
  const admin = createAdminClient();
  const { data: joined, error } = await admin
    .from("challenge_participants")
    .select("challenge_id")
    .eq("user_id", userId);
  if (error) throw new Error(`Chargement des défis : ${error.message}`);
  if (joined.length === 0) return [];

  const { data: challenges, error: challengesError } = await admin
    .from("challenges")
    .select("id, creator_id, ends_at")
    .in(
      "id",
      joined.map((j) => j.challenge_id),
    )
    .gt("ends_at", new Date().toISOString())
    .order("ends_at")
    .limit(10);
  if (challengesError) throw new Error(`Chargement des défis : ${challengesError.message}`);
  if (challenges.length === 0) return [];

  const { data: creators } = await admin
    .from("profiles")
    .select("id, display_name")
    .in("id", [...new Set(challenges.map((c) => c.creator_id))]);
  const names = new Map((creators ?? []).map((p) => [p.id, p.display_name]));

  return challenges.map((c) => ({
    id: c.id,
    creatorName: names.get(c.creator_id) ?? null,
    endsAt: new Date(c.ends_at),
    mine: c.creator_id === userId,
  }));
}
