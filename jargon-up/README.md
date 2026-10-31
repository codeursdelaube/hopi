# Hopi

L'anglais professionnel de ta filière, appris comme un jeu (XP, séries, niveaux), avec Hopi le lapin comme mascotte.
La spécification complète du projet est dans [BRIEFING.md](BRIEFING.md).

## Stack

- **Next.js 16** (App Router, TypeScript strict), code dans `src/`
- **Tailwind CSS v4** + **DaisyUI 5** (thèmes `hopi` / `hopi-dark` dans `src/app/globals.css`)
- **Motion** (`motion/react`) pour les animations, qui respectent `prefers-reduced-motion`
- **Zod** pour la validation
- **Vitest** + Testing Library pour les tests
- **Supabase** (auth Google + base de données), à partir de la Phase 1

## Démarrer

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs (Phase 1)
npm run dev                  # http://localhost:3000
```

## Scripts

| Commande            | Rôle                                   |
| ------------------- | -------------------------------------- |
| `npm run dev`       | Serveur de développement               |
| `npm run build`     | Build de production                    |
| `npm run lint`      | ESLint                                 |
| `npm run typecheck` | Vérification TypeScript                |
| `npm test`          | Tests Vitest (une passe)               |
| `npm run format`    | Formatage Prettier (+ tri des classes) |

## Organisation

```
src/
  app/                  # routes (App Router) ; (marketing)/ = page d'accueil publique
  components/
    game/               # Mascot (Hopi), et plus tard XPBadge, StreakFlame, Confetti…
    marketing/          # composants de la page d'accueil
  lib/i18n/fr.ts        # tous les textes d'interface (français)
  test/setup.ts         # configuration des tests
```

## Conventions

- Interface 100 % en français ; les textes vivent dans `src/lib/i18n/fr.ts`.
- Mobile-first (tester à 360 px), zones tactiles ≥ 44 px.
- Bouton « jeu » : classes DaisyUI + utilitaire maison `btn-pop` (relief qui s'enfonce au clic).
- Mascotte : `<Mascot mood="neutral" | "happy" | "sad" | "proud" />`.
