/**
 * Textes d'interface centralisés (français).
 * Le contenu pédagogique anglais vit ailleurs (src/content/).
 */
export const fr = {
  app: {
    name: "Hopi",
    tagline: "L'anglais de ton métier, comme un jeu.",
    description:
      "Apprends le vocabulaire anglais de ta filière (informatique, droit, gestion…) en quelques minutes par jour : XP, séries, niveaux et un lapin pour t'encourager.",
  },
  mascot: {
    name: "Hopi",
    moods: {
      neutral: "Hopi le lapin te regarde",
      happy: "Hopi le lapin est content",
      sad: "Hopi le lapin est triste",
      proud: "Hopi le lapin est fier de toi",
    },
    bubbles: {
      neutral: "Salut ! Moi c'est Hopi. Prêt·e à parler tech en anglais ?",
      happy: "Yes! Bonne réponse ! 🎉",
      sad: "Oups… pas grave, on réessaie ensemble.",
      proud: "Leçon terminée ! Je suis trop fier de toi !",
    },
    tapHint: "Touche Hopi pour voir ses humeurs",
  },
  landing: {
    ctaStart: "Commencer gratuitement",
    ctaLogin: "J'ai déjà un compte",
    featuresTitle: "Pourquoi ça marche",
    features: [
      {
        icon: "🎯",
        title: "Le vocabulaire de TON métier",
        text: "Deploy, merge, endpoint, firewall… les mots que tu croises vraiment au travail.",
      },
      {
        icon: "⚡",
        title: "5 minutes par jour",
        text: "Des exercices courts et animés. Une série quotidienne pour garder le rythme.",
      },
      {
        icon: "💬",
        title: "Explication en français",
        text: "Un doute ? Un bouton t'explique chaque mot et chaque réponse en français.",
      },
      {
        icon: "🧠",
        title: "Tu n'oublies plus",
        text: "Les mots ratés reviennent au bon moment grâce à la répétition espacée.",
      },
    ],
    fieldsTitle: "Choisis ta filière",
    comingSoon: "Bientôt",
    available: "Disponible",
    footer: "Gratuit · Pensé pour le mobile · Fait au Togo",
  },
  auth: {
    loginTitle: "Content de te voir !",
    loginSubtitle: "Connecte-toi pour garder tes XP, ta série et ta progression.",
    google: "Continuer avec Google",
    redirecting: "Redirection…",
    terms: "En continuant, tu acceptes nos conditions d'utilisation.",
    backHome: "Retour à l'accueil",
    signOut: "Se déconnecter",
    errors: {
      oauth: "La connexion avec Google n'a pas abouti. Réessaie.",
      callback: "Impossible de finaliser la connexion. Réessaie.",
    },
  },
  shell: {
    hello: (name: string) => `Salut ${name} !`,
    learnPlaceholder: "Ton parcours arrive à la prochaine étape. Hopi s'échauffe 🥕",
    onboardingPlaceholder: "Ici, tu choisiras bientôt ta filière, ton niveau et ton objectif.",
  },
  fields: [
    { slug: "tech", icon: "💻", name: "Informatique", published: true },
    { slug: "law", icon: "⚖️", name: "Droit", published: false },
    { slug: "communication", icon: "📣", name: "Communication", published: false },
    { slug: "accounting", icon: "📊", name: "Compta / Gestion", published: false },
    { slug: "economics", icon: "📈", name: "Économie", published: false },
  ],
} as const;
