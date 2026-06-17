function hashSeed(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return ((state >>> 0) / 4294967296);
  };
}

export function seededShuffle(items, seedValue) {
  const result = [...items];
  const random = seededRandom(hashSeed(seedValue));

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

export function buildShuffledQuestion(question, seedValue) {
  const alternatives = question.alternatives || [];
  const shuffledAlternatives = seededShuffle(
    alternatives.map((text, originalIndex) => ({ text, originalIndex })),
    `${seedValue}_${question.id}_alternatives`
  );

  return {
    ...question,
    displayAlternatives: shuffledAlternatives
  };
}
