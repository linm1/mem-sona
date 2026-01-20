// convex/extraction.ts
// LLM-Based Fact Extraction - Uses Gemini to extract atomic facts from resources

import { action, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { callGeminiWithRetry, parseGeminiJson } from "./utils/gemini";

// Types for extracted data
interface ExtractedFact {
  fact: string;
  category: string;
  confidence: number;
}

interface ExtractedEntity {
  name: string;
  type: "project" | "tool" | "skill" | "concept";
  description?: string;
}

interface ExtractedRelationship {
  from: string;
  fromType: string;
  to: string;
  toType: string;
  relationship: string; // uses, requires, knows, works_on, works_at, etc.
  context?: string;
}

/**
 * Result of LLM-based extraction.
 *
 * NOTE: This uses a result object pattern (success + error) instead of throwing
 * because LLM extraction failures are expected and should be handled gracefully.
 * The caller (processResource) can continue processing other resources even if
 * one extraction fails.
 */
interface ExtractionResult {
  facts: ExtractedFact[];
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  /** Whether extraction completed successfully */
  success: boolean;
  /** Error message if success is false */
  error?: string;
}

/**
 * Extract atomic facts, entities, and relationships from raw resource content.
 * This action calls Gemini to analyze text and extract structured data in a single call.
 *
 * Uses result object pattern for graceful degradation - returns {success: false, error}
 * instead of throwing, allowing callers to handle failures without crashing pipelines.
 *
 * @param content - Raw text content to extract from
 * @returns Extracted facts, entities, and relationships with success status
 */
export const extractFacts = internalAction({
  args: {
    content: v.string(),
  },
  handler: async (ctx, args): Promise<ExtractionResult> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        facts: [],
        entities: [],
        relationships: [],
        success: false,
        error: "GEMINI_API_KEY not configured",
      };
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const prompt = `Extract atomic facts, entities, and relationships from the following text.

FACTS:
- Single, self-contained pieces of information about the user
- Category: personal, professional, preferences, projects, skills, tech_preferences, work_context, communication_style, or other
- Confidence score (0-1) based on how clearly stated the information is
- Higher confidence (0.8-1.0) for explicit facts, lower (0.5-0.7) for implied

ENTITIES:
Extract mentions of:
- project: Software projects, products, applications (e.g., "mem-sona", "Next.js app")
- tool: Software tools, libraries, frameworks (e.g., "TypeScript", "React", "Convex")
- skill: Abilities, competencies (e.g., "API design", "backend development")
- concept: Technical concepts, methodologies (e.g., "vector search", "graph databases")
- Include name, type, and optional description

RELATIONSHIPS:
Extract connections between entities using these relationship types:
- uses: User/project uses a tool (e.g., "mem-sona uses Convex")
- requires: Project/tool requires another (e.g., "Next.js requires React")
- knows: User knows a skill (e.g., "User knows TypeScript")
- works_on: User works on project (e.g., "User works_on mem-sona")
- works_at: User works at organization (exclusive - only one at a time)
- primary_language: User's primary programming language (exclusive)
- includes: Project includes tool/component
- implements: Project implements concept
- Optional context field for additional details

Return ONLY valid JSON with this exact structure:
{
  "facts": [{"fact": "string", "category": "string", "confidence": 0.0}],
  "entities": [{"name": "string", "type": "project|tool|skill|concept", "description": "string"}],
  "relationships": [{"from": "string", "fromType": "string", "to": "string", "toType": "string", "relationship": "string", "context": "string"}]
}

If no data can be extracted for a category, return an empty array for that field.

Text to analyze:
${args.content}`;

      const responseText = await callGeminiWithRetry(model, prompt);
      const result = parseGeminiJson<ExtractionResult>(responseText);

      // Validate the response structure
      if (typeof result !== "object" || result === null) {
        return {
          facts: [],
          entities: [],
          relationships: [],
          success: false,
          error: "Invalid response format from Gemini - expected object",
        };
      }

      // Ensure arrays exist
      const facts = Array.isArray(result.facts) ? result.facts : [];
      const entities = Array.isArray(result.entities) ? result.entities : [];
      const relationships = Array.isArray(result.relationships) ? result.relationships : [];

      // Validate facts structure
      const validFacts = facts.filter(
        (f) =>
          typeof f.fact === "string" &&
          typeof f.category === "string" &&
          typeof f.confidence === "number" &&
          f.confidence >= 0 &&
          f.confidence <= 1
      );

      // Validate entities structure
      const validEntities = entities.filter(
        (e) =>
          typeof e.name === "string" &&
          typeof e.type === "string" &&
          ["project", "tool", "skill", "concept"].includes(e.type)
      );

      // Validate relationships structure
      const validRelationships = relationships.filter(
        (r) =>
          typeof r.from === "string" &&
          typeof r.fromType === "string" &&
          typeof r.to === "string" &&
          typeof r.toType === "string" &&
          typeof r.relationship === "string"
      );

      return {
        facts: validFacts,
        entities: validEntities,
        relationships: validRelationships,
        success: true,
      };
    } catch (error) {
      console.error("Extraction failed:", error);
      return {
        facts: [],
        entities: [],
        relationships: [],
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Process a resource: extract facts, entities, and relationships, then store them.
 * This is the main extraction pipeline entry point.
 *
 * @param resourceId - ID of the resource to process
 */
export const processResource = internalAction({
  args: {
    resourceId: v.id("resources"),
  },
  handler: async (ctx, args): Promise<{
    itemsCreated: number;
    categoriesUpdated: number;
    nodesCreated: number;
    edgesCreated: number;
    alreadyProcessed?: boolean;
    error?: string;
  }> => {
    // Get the resource content
    const resource = await ctx.runQuery(internal.resources.getResource, {
      resourceId: args.resourceId,
    });

    if (!resource) {
      throw new Error(`Resource not found: ${args.resourceId}`);
    }

    if (resource.processed) {
      console.log(`Resource ${args.resourceId} already processed, skipping`);
      return {
        itemsCreated: 0,
        categoriesUpdated: 0,
        nodesCreated: 0,
        edgesCreated: 0,
        alreadyProcessed: true
      };
    }

    // Extract facts, entities, and relationships from content
    const extractionResult = await ctx.runAction(internal.extraction.extractFacts, {
      content: resource.content,
    });

    if (!extractionResult.success) {
      console.error(
        `Extraction failed for resource ${args.resourceId}:`,
        extractionResult.error
      );
      return {
        itemsCreated: 0,
        categoriesUpdated: 0,
        nodesCreated: 0,
        edgesCreated: 0,
        error: extractionResult.error
      };
    }

    // Store each fact as an item (with embedding)
    let itemsCreated = 0;
    for (const fact of extractionResult.facts) {
      // Only store facts with sufficient confidence
      if (fact.confidence >= 0.5) {
        try {
          // addItem is a public action (not internal), so use api instead of internal
          await ctx.runAction(api.items.addItem, {
            content: fact.fact,
            category: fact.category,
            resourceId: args.resourceId,
          });
          itemsCreated++;
        } catch (error) {
          console.error(`Failed to store fact: ${fact.fact}`, error);
        }
      }
    }

    // Process entities: create graph nodes
    let nodesCreated = 0;
    for (const entity of extractionResult.entities) {
      try {
        const result = await ctx.runAction(internal.graph.createNodeInternal, {
          name: entity.name,
          type: entity.type,
          properties: {
            description: entity.description,
          },
        });

        // Only count newly created nodes, not existing ones
        if (result.wasCreated) {
          nodesCreated++;
          console.log(`Created node: ${entity.name} (${entity.type})`);
        } else {
          console.log(`Node already exists: ${entity.name} (${entity.type})`);
        }
      } catch (error) {
        // Handle any other unexpected errors
        console.error(`Failed to process node: ${entity.name}`, error);
      }
    }

    // Process relationships: create graph edges
    let edgesCreated = 0;
    for (const rel of extractionResult.relationships) {
      try {
        const result = await ctx.runAction(internal.graph.upsertEdgeInternal, {
          fromName: rel.from,
          fromType: rel.fromType,
          toName: rel.to,
          toType: rel.toType,
          relationship: rel.relationship,
          context: rel.context,
        });
        edgesCreated++;
        console.log(
          `Edge ${result.action}: ${rel.from} -[${rel.relationship}]-> ${rel.to}`
        );
      } catch (error) {
        console.error(
          `Failed to create edge: ${rel.from} -[${rel.relationship}]-> ${rel.to}`,
          error
        );
      }
    }

    // Mark resource as processed
    await ctx.runMutation(internal.resources.markResourceProcessed, {
      resourceId: args.resourceId,
    });

    // Trigger category summarization for affected categories
    const affectedCategories: string[] = Array.from(
      new Set(extractionResult.facts.map((f: ExtractedFact) => f.category))
    );
    for (const category of affectedCategories) {
      try {
        await ctx.runAction(internal.categories.evolveSummary, {
          categoryName: category,
        });
      } catch (error) {
        console.error(`Failed to evolve summary for category: ${category}`, error);
      }
    }

    return {
      itemsCreated,
      categoriesUpdated: affectedCategories.length,
      nodesCreated,
      edgesCreated,
    };
  },
});

/**
 * Process all unprocessed resources.
 * This can be called by a cron job or manually triggered.
 */
export const processAllUnprocessed = action({
  args: {},
  handler: async (ctx): Promise<{
    processed: number;
    totalItemsCreated: number;
    totalNodesCreated: number;
    totalEdgesCreated: number;
    results: Array<{
      resourceId: string;
      itemsCreated: number;
      categoriesUpdated: number;
      nodesCreated: number;
      edgesCreated: number;
      alreadyProcessed?: boolean;
      error?: string;
    }>;
  }> => {
    const unprocessed = await ctx.runQuery(
      internal.resources.getUnprocessedResources,
      {}
    );

    const results = [];
    let totalItemsCreated = 0;
    let totalNodesCreated = 0;
    let totalEdgesCreated = 0;

    for (const resource of unprocessed) {
      const result = await ctx.runAction(internal.extraction.processResource, {
        resourceId: resource._id,
      });
      results.push({
        resourceId: resource._id,
        ...result,
      });

      totalItemsCreated += result.itemsCreated;
      totalNodesCreated += result.nodesCreated;
      totalEdgesCreated += result.edgesCreated;
    }

    return {
      processed: results.length,
      totalItemsCreated,
      totalNodesCreated,
      totalEdgesCreated,
      results,
    };
  },
});
