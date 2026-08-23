// src/lib/rng.ts
// Deterministic pseudo-randomness.
//
// The analysis engine previously called Math.random() directly, so re-running
// the same scenario against the same council produced a different DEFCON level
// every time. That makes the audit log unreproducible: a stored assessment
// could never be re-derived or defended. Seeding from the inputs keeps the
// variation (which is what the temperature setting is for) while making any
// given assessment repeatable.

/** xmur3 string hash — spreads a string into a well-mixed 32-bit seed. */
export function hashSeed(input: string): number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  /** Uniform in [-spread, spread]. */
  jitter(spread: number): number;
}

/**
 * mulberry32 — small, fast, and good enough for scoring variance. Not for
 * anything security-sensitive; use crypto.getRandomValues for that.
 */
export function createRng(seed: string | number): Rng {
  let state = (typeof seed === 'number' ? seed : hashSeed(seed)) >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (min: number, max: number) =>
      min + Math.floor(next() * (max - min + 1)),
    jitter: (spread: number) => (next() - 0.5) * 2 * spread,
  };
}
