// convex/utils/voyage.ts
// Shared Voyage AI utilities for embedding generation

import { VoyageAIClient } from "voyageai";

/**
 * Voyage AI embedding configuration
 * Using voyage-4 (latest generation standard embeddings) with 1024 dimensions
 *
 * NOTE: voyage-context-3 was deprecated by Voyage AI API in Jan 2026.
 * Project migrated to voyage-4 standard embeddings.
 */
export const VOYAGE_CONFIG = {
  model: "voyage-4" as const,
  dimensions: 1024,
} as const;

/**
 * Input type optimization hint for Voyage AI embeddings
 * - "document": Optimized for storage/indexing
 * - "query": Optimized for search queries
 */
export type VoyageInputType = "document" | "query";

/**
 * Create a configured VoyageAI client instance.
 * Throws if VOYAGE_API_KEY environment variable is not set.
 *
 * @returns Configured VoyageAIClient instance
 * @throws Error if VOYAGE_API_KEY is not configured
 */
export function createVoyageClient(): VoyageAIClient {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY not configured");
  }

  return new VoyageAIClient({ apiKey });
}

/**
 * Generate embedding for text using Voyage AI SDK (voyage-4).
 *
 * Uses voyage-4 (latest generation standard embeddings) with 1024-dimension output.
 * voyage-4 uses standard embed() method, not contextualizedEmbed().
 *
 * @param text - Text string to embed
 * @param inputType - "document" for storage, "query" for search
 * @returns Embedding vector (1024 dimensions)
 * @throws Error if API call fails or response is empty
 */
export async function generateEmbedding(
  text: string,
  inputType: VoyageInputType
): Promise<number[]> {
  const client = createVoyageClient();

  const result = await client.embed({
    input: text,
    model: VOYAGE_CONFIG.model,
    inputType: inputType,
    outputDimension: VOYAGE_CONFIG.dimensions,
  });

  if (!result.data || result.data.length === 0 || !result.data[0].embedding) {
    throw new Error("Empty embedding response from Voyage API");
  }

  return result.data[0].embedding;
}

/**
 * Generate embedding for a graph node using Voyage AI.
 * Concatenates node information (name, type, description) for embedding.
 *
 * @param name - Node name
 * @param type - Node type (project, tool, skill, concept)
 * @param description - Optional description
 * @returns Embedding vector (1024 dimensions)
 */
export async function generateNodeEmbedding(
  name: string,
  type: string,
  description?: string
): Promise<number[]> {
  const text = `${name} (${type}): ${description || ""}`;
  return generateEmbedding(text, "document");
}
