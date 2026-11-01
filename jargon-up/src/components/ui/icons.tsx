import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Brain,
  Calculator,
  CalendarCheck,
  Check,
  Flame,
  Footprints,
  Laptop,
  Lock,
  Megaphone,
  Rocket,
  Scale,
  Star,
  TrendingUp,
  Trophy,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/**
 * Icônes de l'appli (Lucide). Les emojis stockés en base (`fields.icon`, `badges.icon`)
 * ne sont plus affichés : l'icône est choisie ici d'après le `slug`.
 */

export function CheckIcon(props: LucideProps) {
  return <Check strokeWidth={3} aria-hidden {...props} />;
}

export function LockIcon(props: LucideProps) {
  return <Lock strokeWidth={2.5} aria-hidden {...props} />;
}

/** Étoile pleine (pastilles du parcours). */
export function StarIcon(props: LucideProps) {
  return <Star fill="currentColor" strokeWidth={1.5} aria-hidden {...props} />;
}

export function ArrowLeftIcon(props: LucideProps) {
  return <ArrowLeft strokeWidth={3} aria-hidden {...props} />;
}

const FIELD_ICONS: Record<string, LucideIcon> = {
  tech: Laptop,
  law: Scale,
  communication: Megaphone,
  accounting: Calculator,
  economics: TrendingUp,
};

export function FieldIcon({ slug, ...props }: { slug: string } & LucideProps) {
  const Icon = FIELD_ICONS[slug] ?? BadgeCheck;
  return <Icon aria-hidden {...props} />;
}

const BADGE_ICONS: Record<string, LucideIcon> = {
  first_lesson: Footprints,
  streak_3: Flame,
  streak_7: CalendarCheck,
  streak_30: Trophy,
  perfect: BadgeCheck,
  xp_100: Star,
  xp_1000: Rocket,
  reviewer: Brain,
};

export function BadgeIcon({ slug, ...props }: { slug: string } & LucideProps) {
  const Icon = BADGE_ICONS[slug] ?? Award;
  return <Icon aria-hidden {...props} />;
}
