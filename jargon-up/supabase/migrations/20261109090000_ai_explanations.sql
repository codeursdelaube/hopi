-- « Explique-moi » : compte les explications par IA demandées par chaque élève, pour appliquer la
-- limite quotidienne. Le contenu (exercice, réponse, explication) n'est PAS conservé.
-- Table lue et écrite uniquement par le serveur (clé secrète) : aucun droit pour les utilisateurs.

create table public.ai_explanations (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index on public.ai_explanations (user_id, created_at);

alter table public.ai_explanations enable row level security;
revoke all on public.ai_explanations from anon, authenticated;
