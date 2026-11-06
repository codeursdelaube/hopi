-- Salle d'attente du Tri express : les joueurs rejoignent la salle et se déclarent prêts, puis
-- l'hôte lance la partie pour tout le monde en même temps (au moins 2 joueurs).

-- Heure de départ commune ; null = salle d'attente.
alter table public.challenge_rooms add column started_at timestamptz;
-- Les salles existantes suivaient l'ancien fonctionnement : elles sont considérées comme lancées.
update public.challenge_rooms set started_at = created_at;

alter table public.challenge_room_players add column ready boolean not null default false;

-- Lancement en une seule transaction : verrou sur la salle, donc pas de double lancement.
-- Les joueurs qui ne sont pas prêts ne participent pas à la partie.
create or replace function public.launch_challenge_room(
  p_room_id uuid,
  p_host_id uuid,
  p_countdown_seconds int
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room record;
  v_ready_others int;
  v_start timestamptz := now() + make_interval(secs => p_countdown_seconds);
begin
  select creator_id, started_at, ends_at into v_room
  from public.challenge_rooms
  where id = p_room_id
  for update;

  if not found then return 'not_found'; end if;
  if v_room.creator_id <> p_host_id then return 'not_host'; end if;
  if v_room.started_at is not null then return 'already'; end if;
  if now() >= v_room.ends_at then return 'closed'; end if;

  select count(*) into v_ready_others
  from public.challenge_room_players
  where room_id = p_room_id and ready and user_id <> p_host_id;
  if v_ready_others < 1 then return 'not_enough'; end if;

  delete from public.challenge_room_players
  where room_id = p_room_id and not ready and user_id <> p_host_id;

  insert into public.challenge_room_players (room_id, user_id, ready)
  values (p_room_id, p_host_id, true)
  on conflict (room_id, user_id) do update set ready = true;

  update public.challenge_room_players set started_at = v_start where room_id = p_room_id;
  update public.challenge_rooms set started_at = v_start where id = p_room_id;
  return 'ok';
end;
$$;

revoke execute on function public.launch_challenge_room(uuid, uuid, int)
  from public, anon, authenticated;
grant execute on function public.launch_challenge_room(uuid, uuid, int) to service_role;
