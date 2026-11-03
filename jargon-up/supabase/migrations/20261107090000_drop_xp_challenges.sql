-- Abandon du défi « le plus d'XP en 7 jours » au profit des salles Tri express
-- (voir 20261106090000_challenge_rooms.sql). Supprime ses tables et sa fonction de classement.
-- ATTENTION : irréversible, les défis de 7 jours existants sont effacés.

drop function if exists public.challenge_scores(uuid);
drop table if exists public.challenge_participants;
drop table if exists public.challenges;
