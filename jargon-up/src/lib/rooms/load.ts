import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  puzzleSchema,
  rankResults,
  type LessonTerms,
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
  /** Temps limite fixé par l'hôte (secondes). */
  timeLimitSeconds: number;
  puzzle: Puzzle;
  /** Joueurs ayant terminé, classés. */
  ranking: RoomResult[];
  playerCount: number;
  /** Partie du visiteur (null s'il n'a pas commencé ou n'est pas connecté). */
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
      .select("id, creator_id, puzzle, ends_at, time_limit_seconds")
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("challenge_room_players")
      .select("user_id, started_at, finished_at, correct, total, duration_ms, xp, placements")
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
    timeLimitSeconds: room.time_limit_seconds,
    puzzle,
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

/** Salles encore ouvertes que l'utilisateur a créées ou rejointes. */
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
