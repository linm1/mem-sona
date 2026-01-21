// convex/utils/math.ts
// Mathematical utility functions for vector operations and similarity calculations

/**
 * Calculates cosine similarity between two embedding vectors.
 *
 * Cosine similarity measures the cosine of the angle between two non-zero vectors
 * in an inner product space. It's commonly used to measure semantic similarity
 * between embeddings.
 *
 * @param vecA - First embedding vector
 * @param vecB - Second embedding vector
 * @returns Similarity score between -1 and 1:
 *   - 1 = vectors are identical (angle of 0°)
 *   - 0 = vectors are orthogonal (angle of 90°)
 *   - -1 = vectors are opposite (angle of 180°)
 * @throws Error if vectors have different dimensions
 *
 * @example
 * ```typescript
 * const vec1 = [1, 0, 0];
 * const vec2 = [1, 0, 0];
 * const similarity = cosineSimilarity(vec1, vec2); // Returns 1.0 (identical)
 * ```
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error(`Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`);
  }

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);

  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}
