-- Heures de rappel choisies par l'utilisateur (révision + mot du jour).
-- Nécessite la migration 20261101090000_push_notifications.sql.

alter table public.profiles
  -- Heures LOCALES (0 à 23) auxquelles envoyer un rappel ; 4 au maximum.
  add column reminder_hours smallint[] not null default '{18}'
    check (
      cardinality(reminder_hours) <= 4
      and reminder_hours <@ array[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]::smallint[]
    ),
  -- Décalage horaire du téléphone (minutes, comme getTimezoneOffset : 0 au Togo).
  add column tz_offset_minutes integer not null default 0
    check (tz_offset_minutes between -840 and 720),
  -- Dernier rappel envoyé (évite les doublons si la tâche tourne deux fois dans l'heure).
  add column last_reminder_at timestamptz;

grant update (reminder_hours, tz_offset_minutes) on public.profiles to authenticated;
