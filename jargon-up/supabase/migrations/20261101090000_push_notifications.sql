-- Notifications push (rappel du mot du jour et des révisions)

-- Un abonnement par appareil / navigateur. Lu et écrit UNIQUEMENT par le serveur (clé secrète) :
-- RLS activée sans aucune policy, et aucun droit pour anon / authenticated.
create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

-- Préférences : quels rappels recevoir (modifiables par l'utilisateur).
alter table public.profiles
  add column notify_word_of_day boolean not null default true,
  add column notify_reviews boolean not null default true;

grant update (notify_word_of_day, notify_reviews) on public.profiles to authenticated;
