# Checklist : Supabase + connexion Google

À faire une fois par environnement (local, puis production).

## 1. Appliquer les migrations

Les fichiers sont dans `supabase/migrations/` (à appliquer dans l'ordre du nom).

- **Option A, éditeur SQL** : Dashboard Supabase → _SQL Editor_ → coller puis exécuter
  `20261031120000_init_schema.sql`, puis `20261031120100_seed_reference_data.sql`.
- **Option B, CLI** : `npx supabase db push --db-url "<DIRECT_URL>"`.

Vérifier ensuite dans _Table Editor_ : 12 tables, toutes marquées **RLS enabled**, et 5 lignes dans `fields`.

## 2. Créer les identifiants Google

1. [Google Cloud Console](https://console.cloud.google.com/) → _APIs & Services_ → _OAuth consent screen_ :
   type **External**, nom « Hopi », e-mail de support, scopes `email`, `profile`, `openid`.
2. _Credentials_ → _Create credentials_ → **OAuth client ID** → type **Web application**.
3. **Authorized JavaScript origins** : `http://localhost:3000` (et plus tard l'URL de production).
4. **Authorized redirect URIs** : l'URL de callback donnée par Supabase, de la forme
   `https://<ref-du-projet>.supabase.co/auth/v1/callback`
   (Supabase → _Authentication_ → _Sign In / Providers_ → _Google_, elle y est affichée).
5. Copier le **Client ID** et le **Client secret**.

## 3. Activer Google dans Supabase

_Authentication_ → _Sign In / Providers_ → **Google** → activer, coller Client ID + Client secret → _Save_.

## 4. URLs de redirection autorisées

_Authentication_ → _URL Configuration_ :

- **Site URL** : `https://hopigame.vercel.app`
- **Redirect URLs** : ajouter
  - `http://localhost:3000/auth/callback`
  - `https://hopigame.vercel.app/auth/callback`
  - `https://hopigame-*.vercel.app/auth/callback` (prévisualisations Vercel, optionnel)

Côté Google Cloud, **Authorized JavaScript origins** : `http://localhost:3000` et `https://hopigame.vercel.app`.

## 5. Tester

1. `npm run dev` → ouvrir `http://localhost:3000/learn` : on est redirigé vers `/login`.
2. « Continuer avec Google » → choisir un compte → retour sur `/onboarding` (profil sans filière).
3. Dans _Table Editor_ → `profiles` : une ligne avec ton nom et ton avatar Google.
4. « Se déconnecter » → retour à l'accueil ; `/learn` redirige de nouveau vers `/login`.

## En production (Vercel)

Ajouter dans _Project Settings → Environment Variables_ : `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (sans préfixe `NEXT_PUBLIC_` !).
