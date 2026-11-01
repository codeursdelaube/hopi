# Checklist de mise en production

## Vercel

- [ ] Variables d'environnement (Production + Preview) :
      `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
      (jamais de préfixe `NEXT_PUBLIC_` sur la clé secrète). Optionnel : `NEXT_PUBLIC_SITE_URL` si le domaine change.
- [ ] Le build passe (`npm run build`) et le déploiement est « Ready ».
- [ ] Domaine personnalisé (si besoin) : l'ajouter dans Vercel, puis dans Supabase (Site URL + Redirect URLs)
      et dans Google Cloud (Authorized JavaScript origins).

## Notifications push

- [ ] Migration `20261101090000_push_notifications.sql` exécutée dans le SQL Editor.
- [ ] `npm run setup:push` lancé une fois (génère les clés dans `.env.local`).
- [ ] Vercel → Environment Variables : `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`
      (mêmes valeurs que `.env.local`), puis redéployer.
- [ ] Migration `20261102090000_reminder_hours.sql` exécutée (heures de rappel choisies par l'utilisateur).
- [ ] **Rappels à l'heure choisie** : exécuter `supabase/setup/hourly-reminders.sql` dans le SQL Editor
      après y avoir collé la valeur de `CRON_SECRET` (Supabase appelle Hopi toutes les heures).
      Vérifier ensuite : `select * from cron.job_run_details order by start_time desc limit 5;`
- [ ] Vercel → Settings → Cron Jobs : la tâche de secours `/api/cron/notifications` (18 h UTC) apparaît.
- [ ] Sur le téléphone : Réglages → Notifications → « Activer les rappels », puis « Envoyer une notification de test ».
      Sur iPhone : installer d'abord Hopi sur l'écran d'accueil (iOS 16.4 minimum).

## Pages légales

- [ ] Compléter `src/lib/legal.ts` (nom de l'éditeur, e-mail de contact) avant la mise en ligne.
- [ ] Relire `/cgu` et `/confidentialite` (idéalement avec un juriste).

## Supabase

- [ ] Migrations appliquées (`supabase/migrations/`, dans l'ordre).
- [ ] Contenu importé : `npm run seed` → « tech : 8 unités, 21 leçons, 168 termes, 262 exercices » (+ 4 filières à 9 leçons).
- [ ] Table Editor : toutes les tables affichent **RLS enabled**.
- [ ] Advisors (Database → Advisors) : aucune alerte de sécurité.
- [ ] Test RLS à deux comptes : le compte B ne voit ni la progression, ni les XP, ni les révisions du compte A.
- [ ] Authentication → URL Configuration : `https://hopigame.vercel.app/auth/callback` dans les Redirect URLs.
- [ ] Sauvegardes : vérifier l'offre (les sauvegardes quotidiennes dépendent du plan Supabase).

## Google OAuth

- [ ] Écran de consentement publié (« In production ») pour que tout le monde puisse se connecter,
      pas seulement les comptes de test.
- [ ] Redirect URI : `https://ozvjnpnxwscwmoodthmx.supabase.co/auth/v1/callback`.

## Vérifications fonctionnelles (sur téléphone, 360 px)

- [ ] Connexion Google → onboarding → carte du parcours.
- [ ] Une leçon complète : confettis, XP, série ; la leçon suivante se déverrouille.
- [ ] Mot du jour : prononciation, +3 XP une seule fois par jour.
- [ ] Révision : `/review` propose les mots vus (prévus pour le lendemain, puis à 6 jours…).
- [ ] Classement, profil (badges), réglages (thème, sons, objectif).
- [ ] PWA : « Ajouter à l'écran d'accueil » proposé ; en mode avion, une page déjà visitée s'ouvre,
      sinon la page « Pas de connexion ».
- [ ] Lighthouse (mobile) sur la page d'accueil : Performance, Accessibilité, SEO ≥ 90.

## Plus tard (hors périmètre actuel)

- Paiement Premium (mobile money + carte) : activer via `src/lib/features.ts` et `profiles.plan`.
- Nouvelles filières : contenu dans `src/content/<slug>/units/`, puis `is_published = true`.
