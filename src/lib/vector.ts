// src/lib/vector.ts
// Text vectorisation and cosine similarity.
//
// The expert router previously described itself as cosine similarity while
// actually counting substring hits, and the `vector` field on every expert was
// never read. This is the real thing: documents become sparse term-frequency
// vectors over a shared vocabulary, and similarity is the cosine of the angle
// between them.

/** Words carrying no domain signal; they would otherwise dominate the norm. */
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'but',
  'by',
  'for',
  'from',
  'has',
  'have',
  'in',
  'into',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'over',
  'that',
  'the',
  'their',
  'there',
  'these',
  'this',
  'to',
  'was',
  'were',
  'will',
  'with',
  'within',
  'we',
  'our',
]);

export type SparseVector = Map<string, number>;

/**
 * Lower-cases, splits on non-word characters, and drops stop words and
 * single-character fragments. Hyphens are kept inside words so terms like
 * "zero-day" and "gain-of-function" survive as single tokens.
 */
export function tokenize(text: string): string[] {
  if (typeof text !== 'string' || text.length === 0) {
    return [];
  }
  return text
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .map(token => token.replace(/^-+|-+$/g, ''))
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

/** Term-frequency vector. Repeated terms raise weight, as they should. */
export function vectorize(tokens: string[]): SparseVector {
  const vector: SparseVector = new Map();
  for (const token of tokens) {
    vector.set(token, (vector.get(token) || 0) + 1);
  }
  return vector;
}

export function magnitude(vector: SparseVector): number {
  let total = 0;
  vector.forEach(weight => {
    total += weight * weight;
  });
  return Math.sqrt(total);
}

/**
 * Cosine similarity in [0, 1] for non-negative vectors. Iterates the smaller
 * vector so cost tracks the query rather than the vocabulary.
 */
export function cosineSimilarity(a: SparseVector, b: SparseVector): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  small.forEach((weight, term) => {
    const other = large.get(term);
    if (other !== undefined) {
      dot += weight * other;
    }
  });

  if (dot === 0) {
    return 0;
  }
  const denominator = magnitude(a) * magnitude(b);
  return denominator === 0 ? 0 : dot / denominator;
}

/**
 * Builds an expert's profile vector. Focus terms are weighted up because a
 * single on-domain term is a stronger signal than its raw count suggests;
 * blind-spot terms are recorded separately so they can subtract rather than
 * inflate the magnitude.
 */
export function buildProfileVector(
  focusKeywords: string[],
  focusWeight = 3,
): SparseVector {
  const vector: SparseVector = new Map();
  for (const keyword of focusKeywords) {
    for (const token of tokenize(keyword)) {
      vector.set(token, (vector.get(token) || 0) + focusWeight);
    }
  }
  return vector;
}
