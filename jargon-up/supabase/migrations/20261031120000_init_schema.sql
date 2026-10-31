-- JargonUp — schéma initial (BRIEFING section 8)
--
-- Principe de sécurité :
--   * Contenu pédagogique : lecture pour les utilisateurs connectés, écriture réservée
--     à la clé secrète (service role, qui contourne RLS).
--   * Données utilisateur : chacun ne LIT que ses lignes.
--   * XP, série, progression, badges : écrits UNIQUEMENT côté serveur (Server Actions
--     avec la clé secrète, après vérification). Le client ne peut pas s'attribuer d'XP.
--   * Profil : l'utilisateur ne peut modifier que ses préférences (droits par colonne).

-- ---------------------------------------------------------------------------
-- Contenu
-- ---------------------------------------------------------------------------

create table public.fields (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_fr text not null,
  name_en text not null,
  icon text,
  is_published boolean not null default false
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  level text not null check (level in ('A2','B1','B2')),
  position int not null,
  title_en text not null,
  title_fr text not null,
  unique (field_id, position)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  position int not null,
  title_en text not null,
  xp_reward int not null default 10 check (xp_reward >= 0),
  unique (unit_id, position)
);

create table public.terms (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.fields(id) on delete cascade,
  term text not null,
  part_of_speech text,
  definition_en text not null,
  explanation_fr text not null,
  example_en text not null,
  example_fr text,
  pronunciation_ipa text,
  level text check (level in ('A2','B1','B2')),
  unique (field_id, term)
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  term_id uuid references public.terms(id) on delete set null,
  type text not null check (type in
    ('multiple_choice','match_pairs','fill_blank','order_words','listen_type','dialogue')),
  position int not null,
  payload jsonb not null,
  explanation_fr text,
  unique (lesson_id, position)
);

create table public.daily_words (
  field_id uuid references public.fields(id) on delete cascade,
  day date not null,
  term_id uuid not null references public.terms(id) on delete cascade,
  primary key (field_id, day)
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_fr text not null,
  description_fr text not null,
  icon text
);

-- ---------------------------------------------------------------------------
-- Utilisateurs
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  field_id uuid references public.fields(id),
  level text not null default 'A2' check (level in ('A2','B1','B2')),
  daily_goal_xp int not null default 20 check (daily_goal_xp between 5 and 200),
  total_xp int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_activity_date date,
  plan text not null default 'free' check (plan in ('free','premium')),
  sound_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.lesson_progress (
  user_id uuid references public.profiles(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  best_score int,
  completed_at timestamptz,
  primary key (user_id, lesson_id)
);

create table public.term_reviews (
  user_id uuid references public.profiles(id) on delete cascade,
  term_id uuid references public.terms(id) on delete cascade,
  ease_factor numeric not null default 2.5,
  interval_days int not null default 0,
  repetitions int not null default 0,
  next_review_at timestamptz not null default now(),
  last_result boolean,
  primary key (user_id, term_id)
);

create table public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount int not null,
  source text not null check (source in ('lesson','review','word_of_day','streak_bonus')),
  created_at timestamptz not null default now()
);

create table public.user_badges (
  user_id uuid references public.profiles(id) on delete cascade,
  badge_id uuid references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- Index sur les clés étrangères et les requêtes fréquentes
create index on public.units (field_id);
create index on public.lessons (unit_id);
create index on public.terms (field_id);
create index on public.exercises (lesson_id);
create index on public.exercises (term_id);
create index on public.daily_words (term_id);
create index on public.profiles (field_id);
create index on public.lesson_progress (lesson_id);
create index on public.term_reviews (term_id);
create index on public.term_reviews (user_id, next_review_at);
create index on public.xp_events (user_id, created_at);
create index on public.xp_events (created_at);
create index on public.user_badges (badge_id);

-- ---------------------------------------------------------------------------
-- RLS + droits
-- ---------------------------------------------------------------------------

alter table public.fields          enable row level security;
alter table public.units           enable row level security;
alter table public.lessons         enable row level security;
alter table public.terms           enable row level security;
alter table public.exercises       enable row level security;
alter table public.daily_words     enable row level security;
alter table public.badges          enable row level security;
alter table public.profiles        enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.term_reviews    enable row level security;
alter table public.xp_events       enable row level security;
alter table public.user_badges     enable row level security;

-- On repart de zéro : aucun droit pour anon/authenticated, puis on accorde le strict nécessaire.
revoke all on
  public.fields, public.units, public.lessons, public.terms, public.exercises,
  public.daily_words, public.badges, public.profiles, public.lesson_progress,
  public.term_reviews, public.xp_events, public.user_badges
from anon, authenticated;

-- Contenu : lecture seule pour les connectés
grant select on
  public.fields, public.units, public.lessons, public.terms, public.exercises,
  public.daily_words, public.badges
to authenticated;

create policy "contenu lisible par les connectés" on public.fields      for select to authenticated using (true);
create policy "contenu lisible par les connectés" on public.units       for select to authenticated using (true);
create policy "contenu lisible par les connectés" on public.lessons     for select to authenticated using (true);
create policy "contenu lisible par les connectés" on public.terms       for select to authenticated using (true);
create policy "contenu lisible par les connectés" on public.exercises   for select to authenticated using (true);
create policy "contenu lisible par les connectés" on public.daily_words for select to authenticated using (true);
create policy "contenu lisible par les connectés" on public.badges      for select to authenticated using (true);

-- Données utilisateur : lecture de ses propres lignes
grant select on
  public.profiles, public.lesson_progress, public.term_reviews, public.xp_events, public.user_badges
to authenticated;

create policy "lire son profil" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "lire sa progression" on public.lesson_progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "lire ses révisions" on public.term_reviews
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "lire ses xp" on public.xp_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "lire ses badges" on public.user_badges
  for select to authenticated using ((select auth.uid()) = user_id);

-- Profil : seules les préférences sont modifiables par l'utilisateur.
-- total_xp, séries, plan… restent hors de portée du client.
grant update (display_name, field_id, level, daily_goal_xp, sound_enabled)
  on public.profiles to authenticated;

create policy "modifier son profil" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- Création automatique du profil à l'inscription (métadonnées Google)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Classement hebdomadaire (semaine ISO commençant le lundi, en UTC)
-- N'expose que le nom, l'avatar et les XP de la semaine.
-- ---------------------------------------------------------------------------

create or replace function public.weekly_leaderboard(limit_count int default 50)
returns table (display_name text, avatar_url text, weekly_xp bigint, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.display_name,
    p.avatar_url,
    sum(e.amount)::bigint as weekly_xp,
    p.id = (select auth.uid()) as is_me
  from public.xp_events e
  join public.profiles p on p.id = e.user_id
  where e.created_at >= date_trunc('week', now() at time zone 'utc') at time zone 'utc'
  group by p.id, p.display_name, p.avatar_url
  order by weekly_xp desc
  limit least(greatest(limit_count, 1), 100);
$$;

revoke execute on function public.weekly_leaderboard(int) from public, anon;
grant execute on function public.weekly_leaderboard(int) to authenticated;
