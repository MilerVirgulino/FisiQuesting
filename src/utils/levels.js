export function xpForLevel(level) {
  return Math.round(120 * Math.pow(level, 1.45));
}

export function getLevelInfo(totalXp = 0) {
  let level = 1;
  let accumulated = 0;
  let nextLevelXp = xpForLevel(level);

  while (totalXp >= accumulated + nextLevelXp) {
    accumulated += nextLevelXp;
    level += 1;
    nextLevelXp = xpForLevel(level);
  }

  const currentLevelXp = totalXp - accumulated;
  const progress = Math.min(100, Math.round((currentLevelXp / nextLevelXp) * 100));

  return {
    level,
    currentLevelXp,
    nextLevelXp,
    progress
  };
}
