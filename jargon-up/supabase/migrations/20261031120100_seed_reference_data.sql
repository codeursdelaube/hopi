-- Données de référence (idempotent) : filières et badges.
-- Seule la filière Tech est publiée pour le MVP.

insert into public.fields (slug, name_fr, name_en, icon, is_published) values
  ('tech',          'Informatique',     'Tech',          '💻', true),
  ('law',           'Droit',            'Law',           '⚖️', false),
  ('communication', 'Communication',    'Communication', '📣', false),
  ('accounting',    'Compta / Gestion', 'Accounting',    '📊', false),
  ('economics',     'Économie',         'Economics',     '📈', false)
on conflict (slug) do update set
  name_fr = excluded.name_fr,
  name_en = excluded.name_en,
  icon = excluded.icon,
  is_published = excluded.is_published;

insert into public.badges (slug, name_fr, description_fr, icon) values
  ('first_lesson', 'Premier pas',      'Termine ta première leçon.',             '🐣'),
  ('streak_3',     'En rythme',        'Atteins une série de 3 jours.',          '🔥'),
  ('streak_7',     'Une semaine !',    'Atteins une série de 7 jours.',          '🗓️'),
  ('streak_30',    'Inarrêtable',      'Atteins une série de 30 jours.',         '🏆'),
  ('perfect',      'Sans faute',       'Termine une leçon avec 100 % de réussite.', '💯'),
  ('xp_100',       'Centurion',        'Gagne 100 XP au total.',                 '⭐'),
  ('xp_1000',      'Expert en jargon', 'Gagne 1 000 XP au total.',               '🚀'),
  ('reviewer',     'Mémoire d''éléphant', 'Révise 50 termes.',                   '🧠')
on conflict (slug) do update set
  name_fr = excluded.name_fr,
  description_fr = excluded.description_fr,
  icon = excluded.icon;
