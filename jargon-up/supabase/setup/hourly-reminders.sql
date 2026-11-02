-- Rappels à l'heure choisie par chaque utilisateur.
--
-- L'offre gratuite de Vercel n'autorise qu'une tâche planifiée par jour. Ici, c'est Supabase
-- (extensions pg_cron + pg_net, disponibles gratuitement) qui appelle Hopi TOUTES LES HEURES ;
-- la route n'envoie un rappel qu'aux utilisateurs dont c'est l'heure.
--
-- À exécuter UNE FOIS dans Supabase → SQL Editor, après avoir remplacé :
--   COLLE_ICI_TON_CRON_SECRET  par la valeur de CRON_SECRET (la même que dans Vercel).
-- Ce fichier n'est pas une migration : il contient un secret, ne le commite jamais rempli.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Le secret est rangé dans le coffre-fort de Supabase (Vault), pas en clair dans la tâche.
-- Rejouable : crée le secret s'il n'existe pas, sinon le met à jour.
do $$
declare
  existing uuid := (select id from vault.secrets where name = 'hopi_cron_secret');
begin
  if existing is null then
    perform vault.create_secret('COLLE_ICI_TON_CRON_SECRET', 'hopi_cron_secret');
  else
    perform vault.update_secret(existing, 'COLLE_ICI_TON_CRON_SECRET');
  end if;
end
$$;

-- Toutes les heures, à la minute 0 (relancer le script met simplement la tâche à jour).
select cron.schedule(
  'hopi-hourly-reminders',
  '0 * * * *',
  $$
  select net.http_get(
    url := 'https://hopigame.vercel.app/api/cron/notifications',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'hopi_cron_secret')
    ),
    timeout_milliseconds := 30000
  );
  $$
);

-- Vérifier : select * from cron.job;
-- Historique : select * from cron.job_run_details order by start_time desc limit 10;
-- Supprimer : select cron.unschedule('hopi-hourly-reminders');
