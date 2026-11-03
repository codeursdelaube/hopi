-- « Vider l'historique » des défis : chaque joueur masque des salles POUR LUI SEUL.
-- Rien n'est supprimé : les scores et le classement restent visibles pour les autres
-- joueurs, et les XP gagnés sont conservés.
-- Table lue et écrite uniquement par le serveur (clé secrète) : aucun droit pour les utilisateurs.

create table public.challenge_room_hidden (
  user_id uuid references public.profiles(id) on delete cascade,
  room_id uuid references public.challenge_rooms(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, room_id)
);

create index on public.challenge_room_hidden (room_id);

alter table public.challenge_room_hidden enable row level security;
revoke all on public.challenge_room_hidden from anon, authenticated;
