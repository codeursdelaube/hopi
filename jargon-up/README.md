# Hopi

L'anglais professionnel de ta filière, appris comme un jeu (XP, séries, niveaux), avec Hopi le lapin comme mascotte.
La spécification complète du projet est dans [BRIEFING.md](BRIEFING.md).

## Stack

- **Next.js 16** (App Router, Cache Components, TypeScript strict), code dans `src/`
- **Supabase** : Postgres + RLS, connexion Google
- **Tailwind CSS v4** + **DaisyUI 5** (thèmes `hopi` / `hopi-dark` dans `src/app/globals.css`)
- **Motion** (`motion/react`) pour les animations, qui respectent `prefers-reduced-motion`
- **Zod** pour la validation, **Vitest** + Testing Library pour les tests
- PWA : `src/app/manifest.ts` + `public/sw.js` (service worker maison, sans dépendance)

## Démarrer

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run dev                  # http://localhost:3000
```

Première installation de la base : voir [docs/SETUP-SUPABASE.md](docs/SETUP-SUPABASE.md), puis `npm run seed`.

## Scripts

| Commande            | Rôle                                                       |
| ------------------- | ---------------------------------------------------------- |
| `npm run dev`       | Serveur de développement                                   |
| `npm run build`     | Build de production                                        |
| `npm run lint`      | ESLint                                                     |
| `npm run typecheck` | Vérification TypeScript                                    |
| `npm test`          | Tests Vitest (logique de jeu, SM-2, contenu, composants)   |
| `npm run format`    | Formatage Prettier (+ tri des classes)                     |
| `npm run seed`      | Importe le contenu (`src/content/`) dans Supabase (idempotent) |

## Organisation

```
src/
  app/
    (marketing)/          page d'accueil publique
    (auth)/login/         connexion Google
    auth/                 callback OAuth, déconnexion
    (app)/                pages connectées avec barre de stats + navigation du bas
      learn/              carte du parcours + mot du jour + rappel de révision
      word-of-the-day/    mot du jour (prononciation, +3 XP)
      leaderboard/        classement hebdomadaire
      profile/            stats, niveau, badges
      settings/           réglages (objectif, niveau, sons, thème) ; upgrade/ = Premium « Bientôt »
    (play)/               écrans plein écran : onboarding/, lesson/[id]/, review/
    offline/              page de secours hors-ligne (service worker)
  components/
    exercises/            un composant par type d'exercice (6 types)
    lesson/               LessonPlayer (moteur de leçon) + LessonResults (écran de fin)
    game/                 Mascot (Hopi), Confetti, StatsBar
  content/
    tech/units/*.json     contenu pédagogique (120 termes, 15 leçons)
    generate.ts           génération déterministe des exercices à partir des termes
  lib/
    gamification/         niveaux, série, dates locales, XP (fonctions pures testées)
    srs/sm2.ts            répétition espacée SM-2 (testée)
    exercises/            schémas Zod des exercices + correction (client ET serveur)
    game/engine.ts        attribution XP / série / badges côté serveur
    features.ts           droits par offre (gratuit / Premium), tout ouvert pour l'instant
    i18n/fr.ts            tous les textes d'interface
supabase/migrations/      schéma SQL versionné (RLS partout)
scripts/seed-content.ts   import du contenu
```

## Règles de jeu (résumé)

- **XP** : leçon = récompense (10, ou 15 pour l'entretien) + 5 si 100 % ; révision = +1 par mot juste ; mot du jour = +3.
  Plafonds quotidiens anti-abus : 400 XP de leçons, 30 XP de révision.
- **Score recalculé côté serveur** à partir des réponses du premier essai : le client n'envoie jamais ses XP.
- **Niveaux** : XP pour atteindre le niveau n = 25 × n × (n − 1).
- **Série** : +1 le premier jour où l'objectif quotidien est atteint, remise à 0 après un jour manqué.
  Les jours suivent le fuseau du navigateur (cookie `tz`), voir `src/lib/gamification/dates.ts`.
- **Mot du jour** : change à minuit UTC (heure du Togo), identique pour tous.
- **Révision** : chaque mot vu en leçon entre dans la file SM-2 ; `/review` propose les mots dus (12 max).

## Ajouter du contenu

1. Ajouter un fichier `src/content/<filière>/units/NN-nom.json` (8 termes par leçon, voir `src/content/schema.ts`).
   Chaque `example_en` doit contenir le terme tel quel (il sert aux phrases à trous).
2. `npm test` : valide tout le contenu (termes uniques, exercices générables).
3. `npm run seed` : importe dans Supabase. Pour une nouvelle filière, passer `fields.is_published` à `true`.
