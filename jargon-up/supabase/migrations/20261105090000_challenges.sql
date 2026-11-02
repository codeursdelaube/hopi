-- Défis entre amis : « qui gagne le plus d'XP en 7 jours ? ».
-- Un utilisateur crée un défi et partage son lien (/defi/<id>) ; ses amis le rejoignent.
-- Le score de chacun = XP gagnés (xp_events) entre created_at et ends_at.
-- Tables lues et écrites uniquement par le serveur (clé secrète) : aucun droit pour les utilisateurs.

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  ends_at timestamptz not null,
  check (ends_at > created_at)
);

create index on public.challenges (creator_id, ends_at);

create table public.challenge_participants (
  challenge_id uuid references public.challenges(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

create index on public.challenge_participants (user_id);

alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;
revoke all on public.challenges, public.challenge_participants from anon, authenticated;

-- Classement d'un défi : XP gagnés par chaque participant pendant la durée du défi.
-- Calculé en SQL (et non en lisant tous les xp_events côté serveur) : pas de limite de lignes.
create or replace function public.challenge_scores(p_challenge_id uuid)
returns table (user_id uuid, display_name text, avatar_url text, xp bigint, joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.display_name,
    p.avatar_url,
    coalesce((
      select sum(e.amount)
      from public.xp_events e
      where e.user_id = cp.user_id
        and e.created_at >= c.created_at
        and e.created_at < c.ends_at
    ), 0)::bigint,
    cp.joined_at
  from public.challenges c
  join public.challenge_participants cp on cp.challenge_id = c.id
  join public.profiles p on p.id = cp.user_id
  where c.id = p_challenge_id;
$$;

revoke execute on function public.challenge_scores(uuid) from public, anon, authenticated;
grant execute on function public.challenge_scores(uuid) to service_role;
