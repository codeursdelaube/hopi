/**
 * Niveaux du joueur, calculés à partir du total d'XP.
 * XP total nécessaire pour atteindre le niveau n : 25 × n × (n − 1)
 * → niv. 1 : 0, niv. 2 : 50, niv. 3 : 150, niv. 4 : 300, niv. 5 : 500…
 * (chaque niveau demande 50 XP de plus que le précédent).
 */
export function xpForLevel(level: number): number {
  const n = Math.max(1, Math.floor(level));
  return 25 * n * (n - 1);
}

export function levelFromXp(totalXp: number): number {
  const xp = Math.max(0, totalXp);
  // Plus grand n tel que 25 n (n − 1) ≤ xp.
  let n = Math.floor((1 + Math.sqrt(1 + (4 * xp) / 25)) / 2);
  while (xpForLevel(n + 1) <= xp) n++;
  while (n > 1 && xpForLevel(n) > xp) n--;
  return n;
}

export type LevelProgress = {
  level: number;
  /** XP gagnés depuis le début du niveau actuel. */
  current: number;
  /** XP nécessaires pour passer ce niveau. */
  needed: number;
  ratio: number;
};

export function levelProgress(totalXp: number): LevelProgress {
  const level = levelFromXp(totalXp);
  const start = xpForLevel(level);
  const needed = xpForLevel(level + 1) - start;
  const current = Math.max(0, totalXp) - start;
  return { level, current, needed, ratio: current / needed };
}
