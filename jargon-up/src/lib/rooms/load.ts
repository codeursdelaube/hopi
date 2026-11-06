import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  puzzleSchema,
  rankOf,
  rankResults,
  type LessonTerms,
  type LobbyPlayer,
  type Puzzle,
  type RoomResult,
} from "@/lib/rooms/room";

/** Leçons d'une filière avec leurs termes (via les exercices, qui relient terme et leçon). */
export async function lessonsWithTerms(fieldId: string): Promise<LessonTerms[]> {
  const supabase = await createClient();
  const { data: units, error } = await supabase.from("units").select("id").eq("field_id", fieldId);
  if (error) throw new Error(`Chargement des unités : ${error.message}`);
  if (units.length === 0) return [];

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id, title_en")
    .in(
      "unit_id",
      units.map((u) => u.id),
    );
  if (lessonsError) throw new Error(`Chargement des leçons : ${lessonsError.message}`);
  if (lessons.length === 0) return [];

  const { data: links, error: linksError } = await supabase
    .from("exercises")
    .select("lesson_id, term_id")
    .in(
      "lesson_id",
      lessons.map((l) => l.id),
    )
    .not("term_id", "is", null);
  if (linksError) throw new Error(`Chargement des exercices : ${linksError.message}`);

  const termIds = [...new Set(links.flatMap((l) => (l.term_id ? [l.term_id] : [])))];
  if (termIds.length === 0) return [];
  const { data: terms, error: termsError } = await supabase
    .from("terms")
    .select("id, term")
    .in("id", termIds);
  if (termsError) throw new Error(`Chargement des termes : ${termsError.message}`);
  const termById = new Map(terms.map((t) => [t.id, t]));

  return lessons.map((lesson) => {
    const ids = new Set(
      links.flatMap((l) => (l.lesson_id === lesson.id && l.term_id ? [l.term_id] : [])),
    );
    return {
      id: lesson.id,
      title: lesson.title_en,
      terms: [...ids].flatMap((id) => {
        const term = termById.get(id);
        return term ? [term] : [];
      }),
    };
  });
}

export type PlayerRow = {
  startedAt: Date;
  finishedAt: Date | null;
  correct: number | null;
  total: number | null;
  durationMs: number | null;
  xp: number | null;
  placements: Record<string, string> | null;
};

export type RoomView = {
  id: string;
  creatorId: string;
  creatorName: string | null;
  endsAt: Date;
  /** Départ commun fixé par l'hôte ; null = salle d'attente. */
  startedAt: Date | null;
  /** Temps limite fixé par l'hôte (secondes). */
  timeLimitSeconds: number;
  puzzle: Puzzle;
  /** Tous les joueurs de la salle, pour la salle d'attente. */
  players: LobbyPlayer[];
  /** Joueurs ayant terminé, classés. */
  ranking: RoomResult[];
  playerCount: number;
  /** Place du visiteur dans la salle (null s'il n'y est pas ou n'est pas connecté). */
  me: PlayerRow | null;
};

/**
 * Salle et classement. Lu avec la clé secrète : la page est publique (les invités ne sont pas
 * forcément connectés) et n'affiche que prénoms, avatars, scores et temps.
 */
export async function loadRoom(id: string, viewerId: string | null): Promise<RoomView | null> {
  const admin = createAdminClient();
  const [{ data: room, error }, { data: players, error: playersError }] = await Promise.all([
    admin
      .from("challenge_rooms")
      .select("id, creator_id, puzzle, ends_at, time_limit_seconds, started_at")
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("challenge_room_players")
      .select(
        "user_id, started_at, finished_at, correct, total, duration_ms, xp, placements, ready",
      )
      .eq("room_id", id),
  ]);
  if (error) throw new Error(`Chargement de la salle : ${error.message}`);
  if (playersError) throw new Error(`Chargement des joueurs : ${playersError.message}`);
  if (!room) return null;

  const puzzle = puzzleSchema.parse(room.puzzle);
  const userIds = [...new Set([room.creator_id, ...players.map((p) => p.user_id)])];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const ranking = rankResults(
    players.flatMap((p) =>
      p.finished_at && p.correct !== null && p.total !== null && p.duration_ms !== null
        ? [
            {
              userId: p.user_id,
              name: profileById.get(p.user_id)?.display_name ?? null,
              avatarUrl: profileById.get(p.user_id)?.avatar_url ?? null,
              correct: p.correct,
              total: p.total,
              durationMs: p.duration_ms,
              xp: p.xp ?? 0,
            },
          ]
        : [],
    ),
  );

  const mine = viewerId ? players.find((p) => p.user_id === viewerId) : undefined;
  return {
    id: room.id,
    creatorId: room.creator_id,
    creatorName: profileById.get(room.creator_id)?.display_name ?? null,
    endsAt: new Date(room.ends_at),
    startedAt: room.started_at ? new Date(room.started_at) : null,
    timeLimitSeconds: room.time_limit_seconds,
    puzzle,
    players: players.map((p) => ({
      userId: p.user_id,
      name: profileById.get(p.user_id)?.display_name ?? null,
      avatarUrl: profileById.get(p.user_id)?.avatar_url ?? null,
      ready: p.ready,
    })),
    ranking,
    playerCount: players.length,
    me: mine
      ? {
          startedAt: new Date(mine.started_at),
          finishedAt: mine.finished_at ? new Date(mine.finished_at) : null,
          correct: mine.correct,
          total: mine.total,
          durationMs: mine.duration_ms,
          xp: mine.xp,
          placements: mine.placements,
        }
      : null,
  };
}

export type ActiveRoom = { id: string; creatorName: string | null; endsAt: Date; mine: boolean };

/** Salles d'attente encore ouvertes que l'utilisateur a créées ou rejointes. */
export async function loadActiveRooms(userId: string): Promise<ActiveRoom[]> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: joined, error } = await admin
    .from("challenge_room_players")
    .select("room_id")
    .eq("user_id", userId);
  if (error) throw new Error(`Chargement des salles : ${error.message}`);

  const joinedIds = joined.map((j) => j.room_id);
  const filter =
    joinedIds.length > 0
      ? `creator_id.eq.${userId},id.in.(${joinedIds.join(",")})`
      : `creator_id.eq.${userId}`;
  const { data: rooms, error: roomsError } = await admin
    .from("challenge_rooms")
    .select("id, creator_id, ends_at")
    .or(filter)
    .gt("ends_at", nowIso)
    .is("started_at", null)
    .order("ends_at")
    .limit(10);
  if (roomsError) throw new Error(`Chargement des salles : ${roomsError.message}`);
  if (rooms.length === 0) return [];

  const { data: creators } = await admin
    .from("profiles")
    .select("id, display_name")
    .in("id", [...new Set(rooms.map((r) => r.creator_id))]);
  const names = new Map((creators ?? []).map((p) => [p.id, p.display_name]));

  return rooms.map((r) => ({
    id: r.id,
    creatorName: names.get(r.creator_id) ?? null,
    endsAt: new Date(r.ends_at),
    mine: r.creator_id === userId,
  }));
}

export type RoomHistoryItem = {
  id: string;
  creatorName: string | null;
  mine: boolean;
  createdAt: Date;
  endsAt: Date;
  /** Départ de la partie ; null = salle d'attente. */
  startedAt: Date | null;
  /** Joueurs ayant terminé. */
  players: number;
  /** Partie de l'utilisateur (null s'il n'a pas joué, ex. sa propre salle). */
  result: { correct: number; total: number; xp: number; durationMs: number; rank: number } | null;
};

/** Salles créées ou jouées par l'utilisateur (identifiants). */
export async function historyRoomIds(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  const [{ data: created, error }, { data: played, error: playedError }] = await Promise.all([
    admin.from("challenge_rooms").select("id").eq("creator_id", userId),
    admin.from("challenge_room_players").select("room_id").eq("user_id", userId),
  ]);
  if (error) throw new Error(`Chargement de l'historique : ${error.message}`);
  if (playedError) throw new Error(`Chargement de l'historique : ${playedError.message}`);
  return [...new Set([...created.map((r) => r.id), ...played.map((p) => p.room_id)])];
}

/**
 * Historique des défis : salles créées ou jouées par l'utilisateur (ouvertes ou fermées),
 * les plus récentes d'abord, avec son score et son rang. Les salles qu'il a masquées
 * (« Vider l'historique ») n'y figurent plus.
 */
export async function loadRoomHistory(userId: string, limit = 20): Promise<RoomHistoryItem[]> {
  const admin = createAdminClient();
  const [all, { data: hidden, error: hiddenError }] = await Promise.all([
    historyRoomIds(userId),
    admin.from("challenge_room_hidden").select("room_id").eq("user_id", userId),
  ]);
  if (hiddenError) throw new Error(`Chargement de l'historique : ${hiddenError.message}`);
  const hiddenIds = new Set(hidden.map((h) => h.room_id));
  const ids = all.filter((id) => !hiddenIds.has(id));
  if (ids.length === 0) return [];

  const { data: rooms, error: roomsError } = await admin
    .from("challenge_rooms")
    .select("id, creator_id, created_at, ends_at, started_at")
    .in("id", ids)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (roomsError) throw new Error(`Chargement de l'historique : ${roomsError.message}`);
  if (rooms.length === 0) return [];

  const roomIds = rooms.map((r) => r.id);
  const [{ data: players, error: playersError }, { data: creators }] = await Promise.all([
    admin
      .from("challenge_room_players")
      .select("room_id, user_id, correct, total, duration_ms, xp")
      .in("room_id", roomIds)
      .not("finished_at", "is", null),
    admin
      .from("profiles")
      .select("id, display_name")
      .in("id", [...new Set(rooms.map((r) => r.creator_id))]),
  ]);
  if (playersError) throw new Error(`Chargement de l'historique : ${playersError.message}`);
  const names = new Map((creators ?? []).map((p) => [p.id, p.display_name]));

  return rooms.map((room) => {
    const ranking = rankResults(
      players.flatMap((p) =>
        p.room_id === room.id && p.correct !== null && p.total !== null && p.duration_ms !== null
          ? [
              {
                userId: p.user_id,
                name: null,
                avatarUrl: null,
                correct: p.correct,
                total: p.total,
                durationMs: p.duration_ms,
                xp: p.xp ?? 0,
              },
            ]
          : [],
      ),
    );
    const rank = rankOf(ranking, userId);
    const mineResult = rank ? ranking[rank - 1] : null;
    return {
      id: room.id,
      creatorName: names.get(room.creator_id) ?? null,
      mine: room.creator_id === userId,
      createdAt: new Date(room.created_at),
      endsAt: new Date(room.ends_at),
      startedAt: room.started_at ? new Date(room.started_at) : null,
      players: ranking.length,
      result:
        mineResult && rank
          ? {
              correct: mineResult.correct,
              total: mineResult.total,
              xp: mineResult.xp,
              durationMs: mineResult.durationMs,
              rank,
            }
          : null,
    };
  });
}
