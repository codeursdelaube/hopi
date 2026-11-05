# Checklist : Supabase + connexion Google et par e-mail

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

## 6. Connexion par e-mail (code à 6 chiffres)

Formulaire « Ton adresse e-mail » sous le bouton Google sur `/login` : on reçoit un code à
6 chiffres (toute adresse : iCloud, Gmail, Outlook…). Gratuit, idéal pour les utilisateurs
d'iPhone sans compte Google. L'e-mail contient aussi un lien, qui fonctionne de la même façon.

1. **Activer** : _Authentication_ → _Sign In / Providers_ → **Email** → activé (laisser
   « Email OTP Length » à 6, expiration 3600 s).
2. **Mettre le code dans l'e-mail** : _Authentication_ → _Emails_ → _Templates_ → modifier
   **Magic Link** ET **Confirm signup** (le second est envoyé à la première connexion).
   Sujet : `Ton code Hopi : {{ .Token }}`. Corps :

   ```html
   <h2>Ton code de connexion Hopi</h2>
   <p style="font-size:32px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
   <p>
     Tape ce code dans l'appli (valable 1 heure). Ou touche ce lien :
     <a href="{{ .ConfirmationURL }}">me connecter</a>.
   </p>
   <p>Tu n'as rien demandé ? Ignore cet e-mail.</p>
   ```

3. **Envoi des e-mails (obligatoire)** : l'expéditeur intégré de Supabase n'envoie qu'aux membres
   de ton équipe Supabase, pas à tes utilisateurs. Brancher un SMTP gratuit, par exemple
   **[Brevo](https://www.brevo.com)** (300 e-mails/jour gratuits, sans nom de domaine) :
   - créer le compte Brevo → _Expéditeurs_ → ajouter et **valider** l'adresse d'envoi
     (ex. ton Gmail) ;
   - _SMTP & API_ → onglet **SMTP** → noter le **Login SMTP** et générer une **clé SMTP** ;
   - Supabase → _Authentication_ → _Emails_ → _SMTP Settings_ → **Enable custom SMTP** :
     hôte `smtp-relay.brevo.com`, port `587`, utilisateur = le login SMTP Brevo,
     mot de passe = la clé SMTP, e-mail d'envoi = l'adresse validée, nom « Hopi » → _Save_.
4. **Limite d'envoi** : _Authentication_ → _Rate Limits_ → « Rate limit for sending emails » :
   la passer à 100 par heure (30 par défaut avec un SMTP personnalisé).
5. **Activer le formulaire** : il est caché par défaut. Ajouter `EMAIL_LOGIN_ENABLED=true` dans
   Vercel (_Settings → Environment Variables_) et dans `.env.local`, puis redéployer.
6. Tester : `/login` → ton adresse → « Recevoir un code » → saisir le code reçu.

## 7. Connexion avec Apple (non activée : compte payant requis)

Le bouton Apple n'est pas affiché. Si un jour tu prends le compte Apple Developer, voici la
marche à suivre (le générateur de secret `npm run apple:secret` est déjà prêt), puis il
faudra rajouter le bouton « Continuer avec Apple » sur `/login`.

Connexion pratique sur iPhone et Mac (Face ID / Touch ID).
Il faut un **compte Apple Developer payant** (99 $/an) : <https://developer.apple.com/account>.

1. **Team ID** : _Membership details_ → noter le **Team ID** (10 caractères).
2. **App ID** : _Certificates, Identifiers & Profiles_ → _Identifiers_ → **+** → _App IDs_ → _App_ →
   description « Hopi », Bundle ID `app.hopigame` → cocher **Sign in with Apple** → _Register_.
3. **Services ID** (l'identifiant du site) : _Identifiers_ → **+** → _Services IDs_ →
   identifiant `app.hopigame.web` → _Register_. Puis l'ouvrir → cocher **Sign in with Apple** →
   _Configure_ :
   - _Primary App ID_ : l'App ID de l'étape 2 ;
   - _Domains and Subdomains_ : `<ref-du-projet>.supabase.co` ;
   - _Return URLs_ : `https://<ref-du-projet>.supabase.co/auth/v1/callback`
     (la même URL de callback que pour Google, affichée dans Supabase) ;
   - _Next_ → _Done_ → _Continue_ → _Save_.
4. **Clé privée** : _Keys_ → **+** → nom « Hopi Sign in with Apple » → cocher **Sign in with Apple** →
   _Configure_ → choisir l'App ID → _Save_ → _Continue_ → _Register_ → **Download** le fichier
   `AuthKey_XXXXXXXXXX.p8` (téléchargeable **une seule fois** ; le garder hors du dépôt) et noter
   le **Key ID**.
5. **Secret (JWT)** : `npm run apple:secret -- --team <TEAM_ID> --key-id <KEY_ID> --services-id app.hopigame.web --p8 <chemin/AuthKey_XXXXXXXXXX.p8>`
6. **Supabase** → _Authentication_ → _Sign In / Providers_ → **Apple** → activer :
   - _Client IDs_ : `app.hopigame.web` (le Services ID) ;
   - _Secret Key (for OAuth)_ : le JWT de l'étape 5 → _Save_.
7. Tester : « Continuer avec Apple » sur `/login` (sur iPhone : Face ID, sans mot de passe).

⚠️ **Le secret expire au bout de 6 mois** : refaire l'étape 5 (même fichier `.p8`) et le recoller
dans Supabase avant la date affichée par la commande, sinon la connexion Apple cesse de marcher.

Bon à savoir : Apple ne transmet le nom de l'utilisateur qu'à la **première** connexion, et il peut
choisir de **masquer son e-mail** (adresse relais `@privaterelay.appleid.com`). Le nom affiché se
modifie dans _Réglages_.

## 8. « Explique-moi » (explication d'une erreur par l'IA)

Sans clé, le bouton n'apparaît pas et l'explication écrite reste affichée.

1. Appliquer la migration `20261109090000_ai_explanations.sql` (limite quotidienne par élève).
2. Créer une clé dans [Google AI Studio](https://aistudio.google.com/apikey) et l'ajouter à
   `.env.local` et à Vercel (_Settings → Environment Variables_) : `GEMINI_API_KEY`, sans préfixe
   `NEXT_PUBLIC_`. Redéployer.

⚠️ Conditions de l'offre gratuite de Gemini : Google peut réutiliser les contenus envoyés et des
personnes peuvent les relire (d'où l'absence de nom et d'e-mail dans les messages) ; le bouton est
masqué dans l'EEE, en Suisse et au Royaume-Uni ; les conditions interdisent les services accessibles
aux moins de 18 ans. Vérifier les quotas sur <https://aistudio.google.com/rate-limit>.

## En production (Vercel)

Ajouter dans _Project Settings → Environment Variables_ : `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (sans préfixe `NEXT_PUBLIC_` !).
