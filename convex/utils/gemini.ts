// convex/utils/gemini.ts
// Shared Gemini API utilities with retry logic

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Maximum retry attempts for Gemini API calls
 */
export const MAX_RETRIES = 3;

/**
 * Base delay in ms between retries (exponential backoff)
 */
export const RETRY_DELAY_BASE = 1000;

/**
 * Helper function to call Gemini with retry logic.
 * Implements exponential backoff for transient failures.
 *
 * @param model - Gemini generative model instance
 * @param prompt - The prompt to send to the model
 * @param retries - Number of retry attempts (default: MAX_RETRIES)
 * @returns The generated text response
 * @throws Error if all retries fail or on non-transient errors
 */
export async function callGeminiWithRetry(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  prompt: string,
  retries: number = MAX_RETRIES
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error) {
      lastError = error as Error;
      console.error(`Gemini API attempt ${attempt + 1} failed:`, error);

      // Don't retry on non-transient errors
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (
          message.includes("api key") ||
          message.includes("invalid") ||
          message.includes("authentication")
        ) {
          throw error; // Don't retry auth errors
        }
      }

      // Exponential backoff before retry
      if (attempt < retries - 1) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Gemini API call failed after all retries");
}

/**
 * Parse JSON from Gemini response, handling markdown code blocks.
 * Gemini often wraps JSON in ```json ... ``` code blocks.
 *
 * @param responseText - Raw response text from Gemini
 * @returns Parsed JSON object
 * @throws Error if JSON parsing fails
 */
export function parseGeminiJson<T>(responseText: string): T {
  // Remove markdown code blocks if present
  let cleanText = responseText.trim();

  // Handle ```json ... ``` format
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.slice(7);
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText.slice(3);
  }

  if (cleanText.endsWith("```")) {
    cleanText = cleanText.slice(0, -3);
  }

  cleanText = cleanText.trim();

  return JSON.parse(cleanText) as T;
}
