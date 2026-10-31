# BRIEFING — Application d'anglais professionnel par filière (nom de l'application : **Hopi**, comme la mascotte lapin ; ancien nom de travail : JargonUp)

> **Instruction pour l'IA qui lit ce fichier (Claude Opus 5.5) :**
> Lis tout ce document avant d'écrire la moindre ligne de code. Il est la source de vérité du projet.
> Le développeur (Koffi) a déjà créé le projet Next.js à la main et ouvert le dossier dans VS Code.
> Travaille **phase par phase** (section 12), en t'arrêtant à la fin de chaque phase pour que je valide.
> Si une information manque ou si un choix est ambigu, pose **une question courte** plutôt que de deviner.
> Avant d'utiliser une API de bibliothèque (Next.js 16, Supabase SSR, Motion, DaisyUI), **vérifie la documentation actuelle**, car ces outils évoluent vite et ta mémoire peut être périmée.

---

## 1. Vision en une phrase

Une application web (PWA) qui aide les étudiants et professionnels francophones à **maîtriser l'anglais de leur domaine** (informatique d'abord, puis droit, communication, comptabilité/gestion, économie), avec une expérience **fun, comme un jeu** (XP, séries, niveaux), à la Duolingo.

## 2. Pour qui ?

- Étudiants et jeunes professionnels francophones (Afrique de l'Ouest en priorité, Togo en premier).
- Ils ont des bases d'anglais (niveau A2 à B2) mais **ne maîtrisent pas le vocabulaire de leur métier** (ex. lire une documentation technique, un contrat, un rapport financier).
- Beaucoup ont une connexion internet instable et utilisent surtout leur téléphone → **mobile-first** et **tolérant au hors-ligne**.

## 3. Ce que l'application fait (explication simple)

1. L'utilisateur se connecte avec **Google** (en un clic).
2. Il choisit sa **filière** (Tech au départ) et son **niveau**.
3. Il suit un **parcours** découpé en unités et leçons, comme sur Duolingo (une carte de progression).
4. Chaque leçon = une série de **petits exercices** rapides et animés.
5. Il gagne des **XP**, maintient une **série quotidienne** (streak), monte de **niveau**, débloque des **badges**.
6. Chaque jour, il reçoit un **Mot du jour** (Word of the Day) de sa filière.
7. Sur chaque mot et chaque exercice, un bouton **« Explication en français »** affiche l'explication en français.
8. Les mots ratés reviennent plus souvent (répétition espacée).

**Mode d'accès :** 100 % **gratuit pour l'instant**. Une **offre payante (Premium)** sera ajoutée plus tard : le code doit donc être **préparé** pour cela (voir section 10) sans implémenter le paiement maintenant.

## 2bis. Principe directeur : l'interface doit être FUN

C'est le point le plus important du produit. L'app doit donner l'impression de **jouer**, pas d'étudier.

- Animations fluides et joyeuses (Motion) : transitions de cartes, rebond sur bonne réponse, secousse douce sur mauvaise réponse, confettis en fin de leçon, compteur d'XP qui s'incrémente.
- Couleurs vives, gros boutons arrondis, typographie ronde et lisible.
- Une **mascotte** (simple, SVG, expressive : contente, triste, fière).
- Retour immédiat après chaque réponse (vert/rouge + message encourageant + son optionnel).
- Écrans courts, une seule action principale par écran.
- Thème clair et sombre.
- Sons discrets, **désactivables** (réglage).
- Respecter `prefers-reduced-motion` (réduire les animations si demandé).

---

## 4. Stack technique (imposée)

| Domaine | Choix |
|---|---|
| Framework | **Next.js 16** (App Router, TypeScript strict) |
| Base de données + Auth + Storage | **Supabase** (PostgreSQL) |
| Connexion | **Google OAuth via Supabase Auth** (le développeur configure le provider dans le dashboard Supabase) |
| UI | **DaisyUI 5** (plugin Tailwind v4) — *confirmé par le développeur : « DCUI » = DaisyUI, pas shadcn/ui* |
| Mascotte | **Hopi**, lapin SVG animé (`src/components/game/Mascot.tsx`, humeurs `neutral`/`happy`/`sad`/`proud`) |
| Style | **Tailwind CSS v4** |
| Animations | **Motion** (ex Framer Motion) — paquet `motion`, import depuis `motion/react` |
| Client Supabase | `@supabase/supabase-js` + `@supabase/ssr` |
| Validation | **Zod** |
| État client | React state + hooks ; Zustand seulement si vraiment nécessaire |
| Tests | **Vitest** (logique : XP, streak, SRS) + tests de composants clés |
| PWA | Manifest + service worker (ex. Serwist ou solution à jour) en Phase 6 |
| Déploiement visé | **Vercel** + projet Supabase |

### Points d'attention Next.js 16 (à vérifier dans la doc officielle)
- Les API de requête sont **asynchrones** (`await cookies()`, `await headers()`, `params` et `searchParams` en `Promise`).
- Le fichier `middleware.ts` a été **renommé `proxy.ts`** dans Next.js 16 : utilise `proxy.ts` pour le rafraîchissement de session Supabase.
- Privilégie les **Server Components** par défaut ; `"use client"` seulement pour l'interactivité (exercices, animations).
- Utilise les **Server Actions** pour les écritures (enregistrer la progression, XP).

## 5. Variables d'environnement

Fichier `.env.local` (**jamais** commité ; fournir un `.env.example` sans valeurs) :

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # (ou ANON_KEY selon la version du dashboard)
SUPABASE_SERVICE_ROLE_KEY=              # serveur uniquement, jamais exposé au client
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Ne jamais mettre la clé `service_role` dans du code client.

## 6. Authentification (Google via Supabase)

- Bouton « Continuer avec Google » → `supabase.auth.signInWithOAuth({ provider: 'google' })`.
- Route de callback `app/auth/callback/route.ts` qui échange le `code` contre une session, puis redirige vers `/learn` (ou `/onboarding` si le profil n'est pas complété).
- `proxy.ts` rafraîchit la session et protège les routes privées (`/learn`, `/profile`, `/review`…).
- À la première connexion, un trigger SQL crée la ligne `profiles` (voir section 8).
- **Le développeur configure lui-même** le provider Google dans Supabase et les URLs de redirection (local + production). Rédige-lui une courte checklist à la fin de la Phase 1.

## 7. Architecture des dossiers (proposition)

```
src/
  app/
    (marketing)/page.tsx          # page d'accueil publique
    (auth)/login/page.tsx
    auth/callback/route.ts
    (app)/
      layout.tsx                   # barre de navigation, XP, streak
      onboarding/page.tsx          # choix filière + niveau + objectif quotidien
      learn/page.tsx               # carte du parcours (unités / leçons)
      lesson/[lessonId]/page.tsx   # session d'exercices
      review/page.tsx              # révision (répétition espacée)
      word-of-the-day/page.tsx
      leaderboard/page.tsx         # classement hebdomadaire
      profile/page.tsx
      settings/page.tsx
  components/
    ui/                            # petits composants UI réutilisables (DaisyUI)
    game/                          # XPBadge, StreakFlame, Mascot, Confetti, ProgressBar…
    exercises/                     # un composant par type d'exercice
  lib/
    supabase/{client,server,proxy}.ts
    gamification/{xp,streak,levels}.ts
    srs/sm2.ts
    features.ts                    # feature flags (plans gratuit/premium)
  content/                         # contenu des leçons (JSON) + script d'import
  types/
supabase/
  migrations/                      # SQL versionné
  seed.sql
```

## 8. Modèle de données (PostgreSQL / Supabase)

Écris les migrations dans `supabase/migrations/`. Active **RLS (Row Level Security) sur toutes les tables**.

```sql
-- Filières
create table fields (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,            -- 'tech', 'law', 'communication', 'accounting', 'economics'
  name_fr text not null,
  name_en text not null,
  icon text,
  is_published boolean default false
);

-- Unités (chapitres) et leçons
create table units (
  id uuid primary key default gen_random_uuid(),
  field_id uuid references fields(id) on delete cascade,
  level text not null check (level in ('A2','B1','B2')),
  position int not null,
  title_en text not null,
  title_fr text not null
);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references units(id) on delete cascade,
  position int not null,
  title_en text not null,
  xp_reward int not null default 10
);

-- Termes (vocabulaire)
create table terms (
  id uuid primary key default gen_random_uuid(),
  field_id uuid references fields(id) on delete cascade,
  term text not null,                    -- 'deploy'
  part_of_speech text,                   -- 'verb'
  definition_en text not null,
  explanation_fr text not null,          -- affichée via le bouton « Explication en français »
  example_en text not null,
  example_fr text,
  pronunciation_ipa text,
  level text check (level in ('A2','B1','B2')),
  unique (field_id, term)
);

-- Exercices (liés à une leçon et éventuellement à un terme)
create table exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references lessons(id) on delete cascade,
  term_id uuid references terms(id) on delete set null,
  type text not null check (type in
    ('multiple_choice','match_pairs','fill_blank','order_words','listen_type','dialogue')),
  position int not null,
  payload jsonb not null,                -- contenu spécifique au type (voir section 9)
  explanation_fr text                    -- explication affichée après la réponse
);

-- Profils utilisateurs
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  field_id uuid references fields(id),
  level text default 'A2',
  daily_goal_xp int default 20,
  total_xp int default 0,
  current_streak int default 0,
  longest_streak int default 0,
  last_activity_date date,
  plan text not null default 'free' check (plan in ('free','premium')),
  sound_enabled boolean default true,
  created_at timestamptz default now()
);

-- Progression
create table lesson_progress (
  user_id uuid references profiles(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete cascade,
  best_score int,
  completed_at timestamptz,
  primary key (user_id, lesson_id)
);

-- Répétition espacée (SM-2) par terme
create table term_reviews (
  user_id uuid references profiles(id) on delete cascade,
  term_id uuid references terms(id) on delete cascade,
  ease_factor numeric default 2.5,
  interval_days int default 0,
  repetitions int default 0,
  next_review_at timestamptz default now(),
  last_result boolean,
  primary key (user_id, term_id)
);

-- Journal d'XP (sert aussi aux classements hebdomadaires)
create table xp_events (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete cascade,
  amount int not null,
  source text not null,                  -- 'lesson', 'review', 'word_of_day', 'streak_bonus'
  created_at timestamptz default now()
);

-- Mot du jour
create table daily_words (
  field_id uuid references fields(id) on delete cascade,
  day date not null,
  term_id uuid references terms(id) on delete cascade,
  primary key (field_id, day)
);

-- Badges
create table badges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_fr text not null,
  description_fr text not null,
  icon text
);

create table user_badges (
  user_id uuid references profiles(id) on delete cascade,
  badge_id uuid references badges(id) on delete cascade,
  earned_at timestamptz default now(),
  primary key (user_id, badge_id)
);
```

**Règles RLS :**
- `fields`, `units`, `lessons`, `terms`, `exercises`, `daily_words`, `badges` : **lecture publique** (utilisateurs connectés), **écriture réservée au service role**.
- `profiles`, `lesson_progress`, `term_reviews`, `xp_events`, `user_badges` : chaque utilisateur ne peut lire/écrire **que ses propres lignes** (`auth.uid() = user_id` / `id`).
- Le classement hebdomadaire passe par une **vue ou fonction SQL** qui n'expose que `display_name`, `avatar_url` et le total d'XP de la semaine.

**Trigger :** à chaque nouvel utilisateur dans `auth.users`, créer automatiquement la ligne `profiles` (nom et avatar depuis les métadonnées Google).

## 9. Types d'exercices et format du `payload`

| Type | Description | Exemple de `payload` |
|---|---|---|
| `multiple_choice` | Choisir la bonne définition/traduction | `{ "question": "What does 'deploy' mean?", "options": ["…","…","…","…"], "answerIndex": 2 }` |
| `match_pairs` | Associer termes ↔ définitions | `{ "pairs": [{"left":"bug","right":"an error in code"}, …] }` |
| `fill_blank` | Compléter une phrase | `{ "sentence": "The server returned a 404 ___.", "answer": "error", "choices": ["error","feature","deploy"] }` |
| `order_words` | Remettre les mots dans l'ordre | `{ "words": ["I","push","my","code"], "answer": "I push my code" }` |
| `listen_type` | Écouter et écrire (synthèse vocale du navigateur) | `{ "text": "repository", "accept": ["repository"] }` |
| `dialogue` | Choisir la bonne réplique dans une situation pro | `{ "context": "Daily stand-up", "lines": [...], "answerIndex": 1 }` |

Valide chaque payload avec **Zod** (un schéma par type) à l'import et à l'affichage.

Chaque exercice a un bouton **« Explication en français »** qui révèle `explanation_fr` (avec animation douce).

## 10. Logique de jeu

**XP**
- Leçon terminée : `xp_reward` (10 par défaut) + bonus de précision (+5 si 100 % de bonnes réponses).
- Révision : +1 XP par terme correctement revu.
- Mot du jour consulté et validé : +3 XP.
- Toute attribution d'XP crée une ligne dans `xp_events` **et** met à jour `profiles.total_xp` (fait côté serveur, jamais côté client).

**Niveaux** : niveau = fonction de `total_xp` (ex. seuils croissants), fonctions pures dans `lib/gamification/levels.ts`, **testées avec Vitest**.

**Streak** : +1 si l'utilisateur atteint son objectif quotidien un nouveau jour ; remis à 0 si un jour est manqué. Gère les fuseaux horaires proprement (utiliser la date locale de l'utilisateur ou UTC de façon cohérente et documentée). Fonctions pures, testées.

**Répétition espacée (SM-2)** : implémenter l'algorithme dans `lib/srs/sm2.ts` ; page `/review` qui propose les termes dont `next_review_at <= now()`. Testé.

**Mot du jour** : un terme par filière et par jour (table `daily_words`, rempli par un script ou un cron Supabase). Affiché en haut de `/learn` et sur `/word-of-the-day` avec prononciation (Web Speech API), exemple et bouton explication FR. Les notifications push viennent plus tard (Phase 7).

**Plan gratuit / Premium (préparation seulement)**
- Tout est **gratuit** aujourd'hui, mais `profiles.plan` existe déjà (`'free'` par défaut).
- Crée `lib/features.ts` avec une fonction `can(plan, feature)` centralisant les droits futurs (ex. `all_fields`, `unlimited_hearts`, `offline_mode`). **Pour l'instant elle renvoie `true` pour tout le monde.**
- **Ne pas implémenter** de paiement, de vies/énergie ni de paywall maintenant. Prévoir seulement un emplacement dans l'UI (page `/settings` ou `/upgrade` vide « Bientôt »).

## 11. Contenu initial (MVP = filière Tech uniquement)

- Filière publiée : **Tech** ; les autres (Droit, Communication, Compta/Gestion, Économie) existent en base avec `is_published = false` et s'affichent comme « Bientôt disponible ».
- Sous-thèmes Tech pour démarrer : Git & versioning, Web & APIs, Bases de données, Réseaux, Cybersécurité (bases), Entretien d'embauche & réunions (stand-up, code review).
- Objectif MVP : **~120 à 200 termes** et **~15 leçons** de qualité plutôt que beaucoup de contenu moyen.
- Écris un script `scripts/seed-content.ts` qui lit les fichiers JSON de `src/content/` et les insère dans Supabase (idempotent : relancer ne duplique rien).
- Génère toi-même un **premier jeu de contenu** réaliste pour Tech (validé ensuite par des humains). Les explications françaises doivent être **claires, simples et exactes**.

---

## 12. Plan de réalisation (phases)

> Termine une phase, vérifie qu'elle fonctionne (lint, typecheck, tests, lancement local), résume ce qui a été fait, puis **attends ma validation**.

**Phase 0 — Fondations**
Nettoyer le projet Next.js existant, installer DaisyUI, Tailwind v4, Motion, Zod, Vitest, ESLint/Prettier ; thème (couleurs fun, polices rondes), structure de dossiers, `.env.example`, README.
*Critère : le projet démarre, une page d'accueil stylée s'affiche, les tests s'exécutent.*

**Phase 1 — Supabase + Google Auth**
Clients Supabase (browser/server), `proxy.ts`, callback OAuth, page `/login`, protection des routes, migrations initiales (section 8) + RLS + trigger de profil. Checklist de configuration Google/Supabase pour le développeur.
*Critère : connexion Google OK, ligne `profiles` créée, routes privées protégées.*

**Phase 2 — Onboarding + carte du parcours**
Choix de la filière, du niveau, de l'objectif quotidien ; page `/learn` avec carte d'unités/leçons (verrouillage progressif, animations).
*Critère : un nouvel utilisateur finit l'onboarding et voit son parcours.*

**Phase 3 — Moteur de leçon + exercices**
Session de leçon, 4 premiers types d'exercices (`multiple_choice`, `match_pairs`, `fill_blank`, `order_words`), feedback animé, bouton « Explication en français », écran de fin avec confettis et XP.
*Critère : une leçon complète jouable de bout en bout, progression enregistrée.*

**Phase 4 — Gamification**
XP, niveaux, streak, objectif quotidien, badges, barre d'en-tête (XP/streak), sons optionnels, mascotte.
*Critère : XP et streak se mettent à jour correctement (tests unitaires verts).*

**Phase 5 — Mot du jour + Révision (SRS)**
`daily_words`, page et widget Mot du jour, prononciation, `/review` avec SM-2, types `listen_type` et `dialogue`.

**Phase 6 — Classement, profil, PWA**
Classement hebdomadaire, page profil (stats, badges), réglages, PWA installable + cache hors-ligne des leçons récentes.

**Phase 7 — Finition et lancement**
Accessibilité, performances (Lighthouse), SEO de la page d'accueil, notifications du Mot du jour (web push ou email), déploiement Vercel, checklist de production (RLS revue, variables d'environnement, domaine).

**Plus tard (hors périmètre actuel)** : paiement Premium (mobile money + carte), vies/énergie, filières Droit/Communication/Compta/Économie, duels entre amis, version établissements.

---

## 13. Règles de qualité et de sécurité

- TypeScript strict, pas de `any` injustifié.
- Aucune clé secrète dans le code ; `service_role` uniquement côté serveur.
- RLS activée partout, testée (un utilisateur ne doit jamais lire/modifier les données d'un autre).
- Toute écriture sensible (XP, streak, progression) passe par le **serveur** (Server Actions) : ne jamais faire confiance au client.
- Interface **100 % en français** (sauf le contenu anglais pédagogique) ; textes d'interface dans un fichier centralisé pour faciliter une future internationalisation.
- Mobile-first : tester d'abord à 360 px de large ; zones tactiles ≥ 44 px.
- Accessibilité : contrastes suffisants, navigation clavier, `aria-label`, respect de `prefers-reduced-motion`.
- Commits petits et clairs (un commit par fonctionnalité) ; messages en français ou anglais, mais cohérents.
- Chaque fonction de logique métier (XP, streak, SRS, niveaux) a **ses tests**.

## 14. Ce que le développeur fait lui-même (ne le fais pas à sa place)

- Créer le projet Supabase et récupérer URL + clés.
- Configurer le provider **Google** dans Supabase (client ID/secret Google Cloud, URLs de redirection).
- Remplir `.env.local`.
- Valider le contenu pédagogique avec des relecteurs.
- Décider du nom final, du logo et de la mascotte.

## 15. Premier message à traiter

Commence par :
1. Confirmer en quelques lignes que tu as compris le projet.
2. Lister les **questions éventuelles** (ex. : « DCUI » = shadcn/ui ? version exacte de Next.js installée ?).
3. Démarrer la **Phase 0**.
