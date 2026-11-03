-- Salles « Tri express » : un joueur crée une salle, partage son lien, et chacun trie les mêmes
-- termes anglais mélangés dans le concept (thème de leçon) auquel ils appartiennent.
-- Chaque joueur a le temps limite fixé par l'hôte ; au-delà (plus une marge réseau), le
-- serveur compte la partie comme perdue.
-- Classement : plus de bonnes réponses, puis le plus rapide. XP attribués côté serveur.
-- Tables lues et écrites uniquement par le serveur (clé secrète) : aucun droit pour les utilisateurs.
-- `puzzle` contient la solution : elle n'est jamais envoyée au navigateur.

create table public.challenge_rooms (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  field_id uuid not null references public.fields(id) on delete cascade,
  -- { concepts: [{ id, label }], terms: [{ id, term, conceptId }] }
  puzzle jsonb not null,
  -- Temps limite choisi par l'hôte pour trier les termes.
  time_limit_seconds int not null default 90 check (time_limit_seconds between 30 and 600),
  created_at timestamptz not null default now(),
  ends_at timestamptz not null,
  check (ends_at > created_at)
);

create index on public.challenge_rooms (creator_id, ends_at);

create table public.challenge_room_players (
  room_id uuid references public.challenge_rooms(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  -- Chronomètre mesuré par le serveur (début = ouverture de la partie).
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  correct int check (correct >= 0),
  total int check (total > 0),
  duration_ms int check (duration_ms >= 0),
  xp int check (xp >= 0),
  -- Réponses du joueur { termId: conceptId } : sert à lui montrer la correction.
  placements jsonb,
  primary key (room_id, user_id)
);

create index on public.challenge_room_players (user_id);

alter table public.challenge_rooms enable row level security;
alter table public.challenge_room_players enable row level security;
revoke all on public.challenge_rooms, public.challenge_room_players from anon, authenticated;

-- Nouvelle source d'XP pour les salles.
alter table public.xp_events drop constraint xp_events_source_check;
alter table public.xp_events add constraint xp_events_source_check
  check (source in ('lesson','review','word_of_day','streak_bonus','challenge'));
