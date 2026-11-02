-- Relance des utilisateurs absents depuis 3 jours (notification push).
-- Colonnes écrites uniquement par le serveur (aucun droit ajouté pour les utilisateurs).

alter table public.profiles
  -- Dernière visite dans l'appli (mise à jour au plus une fois par session).
  -- Les comptes existants partent de « maintenant » : pas de relance immédiate à tout le monde.
  add column last_seen_at timestamptz not null default now(),
  -- Dernière relance d'absence envoyée.
  add column last_inactivity_push_at timestamptz,
  -- Nombre de relances envoyées pendant l'absence en cours (remis à 0 au retour) :
  -- sert à varier le message d'une relance à l'autre.
  add column inactivity_push_count integer not null default 0;

create index on public.profiles (last_seen_at);
