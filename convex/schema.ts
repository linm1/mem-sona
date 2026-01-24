// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============ FILE-BASED MEMORY ============
  
  // Layer 1: Raw source of truth (immutable)
  resources: defineTable({
    content: v.string(), // Full session transcript
    timestamp: v.number(), // Unix timestamp
    sourceAgent: v.string(), // "claude-code", "copilot", "cursor"
    processed: v.boolean(), // Has extraction run?
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_processed", ["processed"]),

  // Layer 2: Atomic facts extracted from resources
  items: defineTable({
    content: v.string(), // The fact itself
    category: v.string(), // "tech_preferences", "projects", etc.
    resourceId: v.id("resources"), // Source traceability
    embedding: v.array(v.float64()), // 1024-dim vector from voyage-4
    createdAt: v.number(),
    accessedAt: v.number(), // Last retrieval time
    accessCount: v.number(), // Retrieval frequency
  })
    .index("by_category", ["category"])
    .index("by_accessed", ["accessedAt"])
    // Vector index using 1024 dimensions to match voyage-4 output
    // voyage-4 default dimension is 1024 (also supports 256, 512, 2048)
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1024, // Fixed dimension for voyage-4 model (default)
      filterFields: ["category"],
    })
    // Text search index for BM25-style keyword matching (hybrid search)
    .searchIndex("by_content", {
      searchField: "content",
      filterFields: ["category"],
    }),

  // Layer 3: Evolving summaries per category
  categories: defineTable({
    name: v.string(), // "tech_preferences", "work_context"
    summary: v.string(), // Markdown summary
    updatedAt: v.number(),
  }).index("by_name", ["name"]),

  // ============ GRAPH-BASED MEMORY ============

  // Entities: projects, tools, skills, people, concepts
  graphNodes: defineTable({
    name: v.string(), // "personal-memory-system"
    type: v.string(), // "project", "tool", "skill", "person"
    properties: v.object({ // Flexible metadata
      description: v.optional(v.string()),
      status: v.optional(v.string()),
      url: v.optional(v.string()),
    }),
    embedding: v.array(v.float64()), // 1024-dim vector from voyage-4
    status: v.string(), // "active" or "archived"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_name", ["name"])
    .index("by_name_type", ["name", "type"])
    .index("by_status", ["status"])
    // Vector index using 1024 dimensions to match voyage-4 output
    // voyage-4 default dimension is 1024 (also supports 256, 512, 2048)
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1024, // Fixed dimension for voyage-4 model (default)
      filterFields: ["type"],
    })
    // Text search index for BM25-style keyword matching (hybrid search)
    .searchIndex("by_name_search", {
      searchField: "name",
      filterFields: ["type", "status"],
    }),

  // Relationships between entities
  graphEdges: defineTable({
    fromNode: v.id("graphNodes"), // Source entity
    toNode: v.id("graphNodes"), // Target entity
    relationship: v.string(), // "uses", "requires", "knows", "works_on"
    weight: v.number(), // Strength/confidence (0-1)
    properties: v.object({ // Flexible metadata
      context: v.optional(v.string()),
      since: v.optional(v.number()),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
    status: v.string(), // "active", "archived", "superseded"
  })
    .index("by_from", ["fromNode"])
    .index("by_to", ["toNode"])
    .index("by_relationship", ["relationship"])
    .index("by_from_relationship", ["fromNode", "relationship"])
    .index("by_status", ["status"]),
});
