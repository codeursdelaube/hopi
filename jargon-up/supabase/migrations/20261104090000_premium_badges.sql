-- Badges Premium : des défis difficiles, réservés à l'offre Premium.
-- Les autres comptes les voient avec un cadenas (voir la page profil) ; seul le serveur
-- les attribue, et seulement si `can(plan, "premium_badges")` (src/lib/features.ts).
-- `icon` : nom de l'icône Lucide (l'appli choisit l'icône d'après le slug, voir BadgeIcon).

alter table public.badges
  add column premium boolean not null default false;

insert into public.badges (slug, name_fr, description_fr, icon, premium) values
  ('streak_100',   'Légende',             'Atteins une série de 100 jours.',                       'crown',          true),
  ('xp_5000',      'Maître du jargon',    'Gagne 5 000 XP au total.',                              'gem',            true),
  ('perfect_10',   'Perfectionniste',     'Termine 10 leçons différentes avec 100 % de réussite.', 'target',         true),
  ('field_master', 'Diplômé',             'Termine toutes les leçons de ta filière.',              'graduation-cap', true),
  ('reviewer_500', 'Mémoire infaillible', 'Révise 500 termes.',                                    'brain-circuit',  true)
on conflict (slug) do update set
  name_fr = excluded.name_fr,
  description_fr = excluded.description_fr,
  icon = excluded.icon,
  premium = excluded.premium;
