PRODUCT REQUIREMENTS DOCUMENT

# Personal Memory System for AI Agents

| | |
| :--- | :--- |
| **Version** | 2.0 (Full Graph Implementation) |
| **Author** | Navis |
| **Date** | January 19, 2026 |
| **Status** | Draft |

## Executive Summary
Build a personal memory infrastructure that enables AI coding agents (Claude Code, GitHub Copilot, Cursor, etc.) to maintain persistent, evolving knowledge about the user across sessions. The system combines file-based categorical memory with a knowledge graph for relationship mapping, treating memory as infrastructure rather than a feature.

## Problem Statement

### Current Pain Points
* **Context Loss:** AI agents forget user preferences, project context, and decisions between sessions
* **Conflicting Information:** Vector databases return contradictory facts from different time periods without resolution
* **Memory Pollution:** Storing raw conversations creates noise; outdated preferences contaminate retrieval
* **No Temporal Awareness:** Embeddings measure similarity, not truth or recency
* **Lost Relationships:** Vector search cannot capture that Project X uses Tool Y which requires Skill Z
* **Agent Lock-in:** Each AI tool maintains separate, incompatible memory silos

### Core Insight
**Memory is infrastructure, not a feature.** You need both categorical facts (preferences, settings) AND relational knowledge (project-uses-tool, skill-requires-prerequisite). The hybrid approach combines file-based summaries for narrative coherence with a knowledge graph for precise relationship queries.

---

## Solution Architecture

### Hybrid Memory Model Overview
The system operates on two parallel tracks that work together:

| Layer | Type | Purpose | Example |
| :--- | :--- | :--- | :--- |
| Resources | File-based | Raw source of truth | Session transcripts |
| Items | File-based | Atomic facts | "User prefers R" |
| Categories | File-based | Evolving summaries | tech_preferences.md |
| Nodes | Graph | Entities | Project, Tool, Skill |
| Edges | Graph | Relationships | uses, requires, knows |

### When to Use Each Track

| File-Based (Categories) | Graph-Based (Nodes/Edges) |
| :--- | :--- |
| User preferences and settings | Project-tool-skill relationships |
| Biographical context | Dependency chains |
| Communication style | "What tools does Project X use?" |
| General knowledge about user | "What skills are needed for Y?" |

### Complete Data Flow
1. **Ingest:** Agent sessions are logged as immutable resources with timestamp and source
2. **Extract Facts:** LLM extracts atomic items (preferences, decisions)
3. **Extract Entities:** LLM identifies entities (projects, tools, skills, people)
4. **Extract Relationships:** LLM identifies connections between entities
5. **Classify & Evolve:** Items go to categories; summaries are rewritten with conflict resolution
6. **Graph Update:** Entities become nodes; relationships become edges with conflict handling
7. **Index:** Items are embedded for vector search; graph edges are weighted by recency

---

## Technical Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| Backend/DB | Convex | Real-time sync, TypeScript-native, built-in vector search |
| Vector Search | Convex Vector Index | Native integration, no external service needed |
| Graph Storage | Convex Tables (nodes/edges) | No separate graph DB needed; queries via indexes |
| Embeddings | voyage-4 | Cost-effective, 1024 dimensions, $0.02/1M tokens |
| LLM Processing | gemini-3-flash-preview | Best extraction and summarization quality |
| Agent Interface | MCP Server (TypeScript) | Standard protocol for Claude Code, Copilot, etc. |
| Scheduler | Convex Cron Jobs | Native scheduled functions for maintenance |
| Dashboard | Next.js + Tailwind | Optional web UI for memory inspection |

### Why No Separate Graph Database
For personal use with hundreds to low thousands of entities, Convex tables with proper indexes handle graph queries efficiently. A dedicated graph DB (Neo4j, etc.) adds operational complexity without meaningful benefit at this scale. The node/edge tables with indexed lookups support all needed traversal patterns.

---

## Complete Data Model

### Convex Schema
```typescript
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
  }).index("by_timestamp", ["timestamp"])
    .index("by_processed", ["processed"]),

  // Layer 2: Atomic facts extracted from resources
  items: defineTable({
    content: v.string(), // The fact itself
    category: v.string(), // "tech_preferences", "projects", etc.
    resourceId: v.id("resources"), // Source traceability
    embedding: v.array(v.float64()), // 1536-dim vector
    createdAt: v.number(),
    accessedAt: v.number(), // Last retrieval time
    accessCount: v.number(), // Retrieval frequency
  }).index("by_category", ["category"])
    .index("by_accessed", ["accessedAt"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
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
    embedding: v.array(v.float64()), // For semantic node search
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_type", ["type"])
    .index("by_name", ["name"])
    .index("by_name_type", ["name", "type"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["type"],
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
  }).index("by_from", ["fromNode"])
    .index("by_to", ["toNode"])
    .index("by_relationship", ["relationship"])
    .index("by_from_relationship", ["fromNode", "relationship"])
    .index("by_status", ["status"]),
});
```

---

## Graph Layer Implementation

### 1. Entity Extraction
When a session is ingested, the LLM extracts both atomic facts AND entities:

```typescript
// convex/extraction.ts
import { action } from "./_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const extractFromResource = action({
  args: { resourceId: v.id("resources") },
  handler: async (ctx, { resourceId }) => {
    const resource = await ctx.runQuery(internal.resources.get, { resourceId });

    // Extract entities and relationships in one LLM call
    const prompt = `Analyze this conversation and extract:
1. ENTITIES: Projects, tools, technologies, skills, people mentioned
2. RELATIONSHIPS: How entities connect (uses, requires, knows, works_on)
3. FACTS: User preferences, decisions, context

Conversation: ${resource.content}

Return JSON:
{
  "entities": [
    { "name": "personal-memory-system", "type": "project", "description": "Memory infrastructure for AI agents" }
  ],
  "relationships": [
    { "from": "personal-memory-system", "fromType": "project", "to": "Convex", "toType": "tool", "relationship": "uses", "context": "backend database" }
  ],
  "facts": [
    { "content": "User prefers Convex over Supabase", "category": "tech_preferences" }
  ]
}`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const result = await model.generateContent(prompt);
    const response = result.response;

    const extracted = JSON.parse(response.text());

    // Process entities
    for (const entity of extracted.entities) {
      await ctx.runMutation(internal.graph.upsertNode, {
        name: entity.name,
        type: entity.type,
        description: entity.description,
      });
    }

    // Process relationships with conflict resolution
    for (const rel of extracted.relationships) {
      await ctx.runMutation(internal.graph.upsertEdge, {
        fromName: rel.from,
        fromType: rel.fromType,
        toName: rel.to,
        toType: rel.toType,
        relationship: rel.relationship,
        context: rel.context,
      });
    }

    // Process facts (existing logic)
    for (const fact of extracted.facts) {
      await ctx.runMutation(internal.items.add, {
        content: fact.content,
        category: fact.category,
        resourceId,
      });
    }
  },
});
```

---

### 2. Graph Conflict Resolution
When relationships change (user switches jobs, project changes tools), the system handles conflicts:

```typescript
// convex/graph.ts
import { mutation, query } from "./_generated/server";

export const upsertEdge = mutation({
  args: {
    fromName: v.string(),
    fromType: v.string(),
    toName: v.string(),
    toType: v.string(),
    relationship: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find or create nodes
    const fromNode = await findOrCreateNode(ctx, args.fromName, args.fromType);
    const toNode = await findOrCreateNode(ctx, args.toName, args.toType);

    // Check for existing relationship
    const existing = await ctx.db
      .query("graphEdges")
      .withIndex("by_from_relationship", (q) =>
        q.eq("fromNode", fromNode).eq("relationship", args.relationship)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // CONFLICT RESOLUTION: Same entity, same relationship type, different target
    // Example: User "works_at" Google -> User "works_at" OpenAI
    const conflicting = existing.filter(e => e.toNode !== toNode && isExclusiveRelationship(args.relationship));

    // Archive old relationships (don't delete - keep history)
    for (const old of conflicting) {
      await ctx.db.patch(old._id, {
        status: "superseded",
        updatedAt: Date.now(),
      });
    }

    // Check if this exact edge exists
    const exactMatch = existing.find(e => e.toNode === toNode);
    if (exactMatch) {
      // Strengthen existing edge
      await ctx.db.patch(exactMatch._id, {
        weight: Math.min(1, exactMatch.weight + 0.1),
        updatedAt: Date.now(),
        properties: { ...exactMatch.properties, context: args.context },
      });
    } else {
      // Create new edge
      await ctx.db.insert("graphEdges", {
        fromNode,
        toNode,
        relationship: args.relationship,
        weight: 0.5,
        properties: { context: args.context },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "active",
      });
    }
  },
});

// Relationships where only one can be active at a time
function isExclusiveRelationship(rel: string): boolean {
  return ["works_at", "primary_language", "current_focus"].includes(rel);
}
```

---

### 3. Graph Traversal Queries
Common query patterns for retrieving related information:

```typescript
// convex/graph.ts (continued)

// Get all tools used by a project
export const getProjectTools = query({
  args: { projectName: v.string() },
  handler: async (ctx, { projectName }) => {
    const project = await ctx.db
      .query("graphNodes")
      .withIndex("by_name_type", (q) => q.eq("name", projectName).eq("type", "project"))
      .first();

    if (!project) return [];

    const edges = await ctx.db
      .query("graphEdges")
      .withIndex("by_from_relationship", (q) => q.eq("fromNode", project._id).eq("relationship", "uses"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const tools = await Promise.all(edges.map(e => ctx.db.get(e.toNode)));
    return tools.filter(t => t?.type === "tool");
  },
});

// Get skills required for a tool (2-hop traversal)
export const getToolPrerequisites = query({
  args: { toolName: v.string() },
  handler: async (ctx, { toolName }) => {
    const tool = await ctx.db
      .query("graphNodes")
      .withIndex("by_name_type", (q) => q.eq("name", toolName).eq("type", "tool"))
      .first();

    if (!tool) return [];

    const edges = await ctx.db
      .query("graphEdges")
      .withIndex("by_from_relationship", (q) => q.eq("fromNode", tool._id).eq("relationship", "requires"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return Promise.all(edges.map(e => ctx.db.get(e.toNode)));
  },
});

// Find path between two entities (for context building)
export const findConnection = query({
  args: {
    startName: v.string(),
    endName: v.string(),
    maxDepth: v.optional(v.number()),
  },
  handler: async (ctx, { startName, endName, maxDepth = 3 }) => {
    const start = await ctx.db.query("graphNodes").withIndex("by_name", (q) => q.eq("name", startName)).first();
    const end = await ctx.db.query("graphNodes").withIndex("by_name", (q) => q.eq("name", endName)).first();

    if (!start || !end) return null;

    // BFS for shortest path
    const visited = new Set([start._id]);
    const queue = [{ node: start._id, path: [start] }];

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;
      if (path.length > maxDepth) continue;

      const edges = await ctx.db
        .query("graphEdges")
        .withIndex("by_from", (q) => q.eq("fromNode", node))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();

      for (const edge of edges) {
        if (edge.toNode === end._id) {
          const endNode = await ctx.db.get(end._id);
          return [...path, { edge: edge.relationship }, endNode];
        }

        if (!visited.has(edge.toNode)) {
          visited.add(edge.toNode);
          const nextNode = await ctx.db.get(edge.toNode);
          queue.push({
            node: edge.toNode,
            path: [...path, { edge: edge.relationship }, nextNode]
          });
        }
      }
    }
    return null; // No path found
  },
});
```

---

### 4. Hybrid Retrieval (Vector + Graph)
The key innovation: run vector search and graph traversal in parallel, then merge results:

```typescript
// convex/retrieval.ts
import { action } from "./_generated/server";

export const hybridSearch = action({
  args: { query: v.string(), maxTokens: v.optional(v.number()) },
  handler: async (ctx, { query, maxTokens = 2000 }) => {
    // Generate embedding for query
    const embedding = await generateEmbedding(query);

    // PARALLEL SEARCH: Vector + Graph
    const [vectorResults, graphResults] = await Promise.all([
      // Track 1: Semantic search on items
      ctx.runQuery(internal.items.vectorSearch, { embedding, limit: 20 }),
      // Track 2: Entity-based graph traversal
      ctx.runAction(internal.graph.entitySearch, { query, embedding }),
    ]);

    // MERGE RESULTS with deduplication and scoring
    const merged = mergeResults(vectorResults, graphResults, query);

    // RELEVANCE FILTERING
    const relevant = merged.filter(r => r.score > 0.7);

    // TIME-DECAY SCORING
    const ranked = relevant.map(r => ({
      ...r,
      finalScore: r.score * calculateTimeDecay(r.timestamp),
    })).sort((a, b) => b.finalScore - a.finalScore);

    // CONTEXT ASSEMBLY (respect token limit)
    return assembleContext(ranked, maxTokens);
  },
});

// Graph-based entity search
export const entitySearch = action({
  args: { query: v.string(), embedding: v.array(v.float64()) },
  handler: async (ctx, { query, embedding }) => {
    // Find relevant nodes by semantic similarity
    const relevantNodes = await ctx.runQuery(internal.graphNodes.vectorSearch, { embedding, limit: 10 });

    // Expand to connected nodes (1-hop)
    const expanded = [];
    for (const node of relevantNodes) {
      // Get outgoing relationships
      const outEdges = await ctx.runQuery(internal.graph.getEdgesFrom, { nodeId: node._id });
      // Get incoming relationships
      const inEdges = await ctx.runQuery(internal.graph.getEdgesTo, { nodeId: node._id });
      
      expanded.push({
        node,
        relationships: [...outEdges, ...inEdges],
      });
    }

    // Format as context
    return expanded.map(e => ({
      content: formatNodeContext(e.node, e.relationships),
      timestamp: e.node.updatedAt,
      source: "graph",
      score: e.node._score, // Vector similarity score
    }));
  },
});

function formatNodeContext(node, relationships) {
  let context = `${node.type}: ${node.name}`;
  if (node.properties.description) {
    context += ` - ${node.properties.description}`;
  }
  const rels = relationships
    .filter(r => r.status === "active")
    .map(r => ` - ${r.relationship}: ${r.targetName}`)
    .join("\n");
  if (rels) {
    context += `\nRelationships:\n${rels}`;
  }
  return context;
}

function calculateTimeDecay(timestamp) {
  const ageDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
  return 1.0 / (1.0 + (ageDays / 30)); // 30-day half-life
}
```

---

## Maintenance & Decay

### Scheduled Jobs

| Job | Schedule | Purpose |
| :--- | :--- | :--- |
| Consolidation | Nightly 3 AM | Merge duplicate items, strengthen frequently-accessed memories |
| Summarization | Weekly Sunday | Compress old items into category summaries, prune stale data |
| Graph Cleanup | Weekly Sunday | Archive unused nodes, reweight edges by access patterns |
| Re-indexing | Monthly 1st | Rebuild embeddings, archive 180-day untouched memories |

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Nightly: Merge duplicates, promote hot memories
crons.daily("nightly-consolidation", { hourUTC: 7, minuteUTC: 0 }, internal.maintenance.nightlyConsolidation);

// Weekly: Compress old data, prune stale memories
crons.weekly("weekly-summarization", { dayOfWeek: "sunday", hourUTC: 8, minuteUTC: 0 }, internal.maintenance.weeklySummarization);

// Weekly: Clean up graph
crons.weekly("weekly-graph-cleanup", { dayOfWeek: "sunday", hourUTC: 9, minuteUTC: 0 }, internal.maintenance.graphCleanup);

// Monthly: Full re-index
crons.monthly("monthly-reindex", { day: 1, hourUTC: 10, minuteUTC: 0 }, internal.maintenance.monthlyReindex);

export default crons;
```

### Graph-Specific Maintenance

```typescript
// convex/maintenance.ts (graph cleanup)
export const graphCleanup = internalAction({
  handler: async (ctx) => {
    // 1. Find nodes with no active edges (orphans)
    const allNodes = await ctx.runQuery(internal.graphNodes.list);
    for (const node of allNodes) {
      const edgeCount = await ctx.runQuery(internal.graph.countActiveEdges, { nodeId: node._id });
      if (edgeCount === 0) {
        const daysSinceUpdate = (Date.now() - node.updatedAt) / (1000 * 60 * 60 * 24);
        // Archive orphan nodes older than 90 days
        if (daysSinceUpdate > 90) {
          await ctx.runMutation(internal.graphNodes.archive, { nodeId: node._id });
        }
      }
    }

    // 2. Decay edge weights based on age
    const activeEdges = await ctx.runQuery(internal.graphEdges.listActive);
    for (const edge of activeEdges) {
      const daysSinceUpdate = (Date.now() - edge.updatedAt) / (1000 * 60 * 60 * 24);
      // Reduce weight by 10% per 30 days of inactivity
      if (daysSinceUpdate > 30) {
        const decayFactor = Math.pow(0.9, Math.floor(daysSinceUpdate / 30));
        const newWeight = edge.weight * decayFactor;
        if (newWeight < 0.1) {
          // Archive very weak edges
          await ctx.runMutation(internal.graphEdges.archive, { edgeId: edge._id });
        } else {
          await ctx.runMutation(internal.graphEdges.updateWeight, { edgeId: edge._id, weight: newWeight });
        }
      }
    }
  },
});
```

---

## MCP Server Interface

### Tools Exposed to Agents

| Tool | Description |
| :--- | :--- |
| memory_search | Hybrid search (vector + graph) with time-decay scoring |
| memory_get_context | Get relevant summaries and relationships for current task |
| memory_add_fact | Add an atomic fact to a category |
| memory_add_entity | Add or update an entity node in the graph |
| memory_add_relationship | Create or strengthen a relationship between entities |
| memory_get_profile | Get full user profile across all categories |
| memory_get_project | Get project details with all related tools and skills |
| memory_log_session | Log conversation for async extraction |

### MCP Server Implementation

```typescript
// mcp-server/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
const server = new Server({
  name: "mem-sona",
  version: "1.0.0",
}, {
  capabilities: { tools: {} },
});

server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "memory_search",
      description: "Search memories using hybrid vector + graph retrieval",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          maxTokens: { type: "number", description: "Max context tokens" },
        },
        required: ["query"],
      },
    },
    {
      name: "memory_get_project",
      description: "Get project with related tools, skills, and context",
      inputSchema: {
        type: "object",
        properties: {
          projectName: { type: "string" },
        },
        required: ["projectName"],
      },
    },
    {
      name: "memory_add_relationship",
      description: "Add relationship between entities",
      inputSchema: {
        type: "object",
        properties: {
          from: { type: "string", description: "Source entity name" },
          fromType: { type: "string", enum: ["project","tool","skill","person"] },
          to: { type: "string", description: "Target entity name" },
          toType: { type: "string", enum: ["project","tool","skill","person"] },
          relationship: { type: "string", enum: ["uses","requires","knows","works_on"] },
          context: { type: "string", description: "Optional context" },
        },
        required: ["from", "fromType", "to", "toType", "relationship"],
      },
    },
    // ... other tools
  ],
}));

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;
  switch (name) {
    case "memory_search":
      const results = await convex.action(api.retrieval.hybridSearch, {
        query: args.query,
        maxTokens: args.maxTokens || 2000,
      });
      return { content: [{ type: "text", text: results }] };
      
    case "memory_get_project":
      const project = await convex.query(api.graph.getProjectWithContext, {
        projectName: args.projectName,
      });
      return { content: [{ type: "text", text: JSON.stringify(project, null, 2) }] };
      
    case "memory_add_relationship":
      await convex.mutation(api.graph.upsertEdge, args);
      return { content: [{ type: "text", text: "Relationship added" }] };
      
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

const transport = new StdioServerTransport();
server.connect(transport);
```

---

## Agent Configuration

### Claude Code Integration
```json
// ~/.claude/mcp.json
{
  "mcpServers": {
    "mem-sona": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "CONVEX_URL": "https://your-deployment.convex.cloud"
      }
    }
  }
}
```

### GitHub Copilot Integration
Copilot supports MCP via VS Code extensions. Configure in .vscode/settings.json or use a Copilot extension that supports MCP servers.

### Cursor Integration
```json
// ~/.cursor/mcp.json (same format as Claude Code)
{
  "mcpServers": {
    "mem-sona": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "CONVEX_URL": "https://your-deployment.convex.cloud"
      }
    }
  }
}
```

---

## Implementation Phases

### Phase 1: Core File-Based Memory (Week 1)
* Set up Convex project with resources, items, categories tables
* Implement resource ingestion and fact extraction
* Build category summarization with conflict resolution
* Create basic MCP server with memory_search and memory_add_fact

### Phase 2: Graph Layer (Week 2)
* Add graphNodes and graphEdges tables
* Implement entity extraction in ingestion pipeline
* Build relationship upsert with conflict resolution
* Add graph traversal queries (getProjectTools, findConnection)

### Phase 3: Hybrid Retrieval (Week 3)
* Implement parallel vector + graph search
* Build result merging with deduplication
* Add time-decay scoring
* Expand MCP server with graph-specific tools

### Phase 4: Maintenance & Polish (Week 4)
* Implement all cron jobs (nightly, weekly, monthly)
* Add graph-specific cleanup (orphan nodes, edge decay)
* Build optional Next.js dashboard for memory inspection
* Test with Claude Code, document integration steps

## Success Metrics
* Agent correctly recalls user preferences across sessions (>95% accuracy)
* Graph queries return correct project-tool-skill relationships
* Conflict resolution handles contradictory information without hallucination
* Hybrid retrieval latency <500ms for context assembly
* Memory storage stays under 0.5GB free tier for personal use
* MCP server connects to Claude Code AND at least one other agent

---

## Project Structure

```text
mem-sona/
├── convex/
│   ├── schema.ts          # Full data model (file + graph)
│   ├── resources.ts       # Raw log storage
│   ├── items.ts           # Atomic fact CRUD + vector search
│   ├── categories.ts      # Summary evolution
│   ├── graph.ts           # Node/edge CRUD, traversal queries
│   ├── extraction.ts      # LLM-based fact + entity extraction
│   ├── retrieval.ts       # Hybrid search implementation
│   ├── maintenance.ts     # Cron job handlers
│   ├── crons.ts           # Scheduled job definitions
│   └── _generated/        # Convex codegen
├── mcp-server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts       # MCP server entry
│   │   ├── tools.ts       # Tool definitions
│   │   └── handlers.ts    # Tool implementations
│   └── dist/              # Compiled output
├── web/                   # Optional dashboard
│   ├── app/
│   │   ├── page.tsx       # Memory explorer
│   │   ├── graph/page.tsx # Graph visualizer
│   │   └── layout.tsx
│   ├── components/
│   │   ├── MemoryList.tsx
│   │   ├── GraphView.tsx
│   │   └── CategorySummary.tsx
│   └── convex/            # Symlink to ../convex
├── package.json
├── convex.json
└── README.md
```

## Appendix: Entity & Relationship Types

### Node Types

| Type | Description | Examples |
| :--- | :--- | :--- |
| project | Software project or initiative | personal-memory-system, sdtm-pipeline |
| tool | Technology, framework, or service | Convex, R, SAS, Next.js, Claude |
| skill | Capability or knowledge area | TypeScript, SDTM, data visualization |
| person | Collaborator or contact | Team members, mentors |
| concept | Abstract idea or domain | clinical trials, regulatory compliance |
| organization | Company or institution | Meta-Clinical Technology, FDA |

### Relationship Types

| Relationship | From -> To | Exclusive? | Example |
| :--- | :--- | :--- | :--- |
| uses | project -> tool | No | project uses Convex |
| requires | tool -> skill | No | R requires statistics |
| knows | user -> skill | No | user knows SAS |
| works_on | user -> project | No | user works_on pipeline |
| works_at | user -> org | Yes | user works_at MCT |
| collaborates_with | user -> person | No | user collaborates_with Bob |
| depends_on | project -> project | No | dashboard depends_on API |
| part_of | concept -> concept | No | SDTM part_of CDISC |

**Exclusive relationships** automatically archive previous edges when a new one is created (e.g., changing employers).---

## Development Standards & Quality Assurance

### TypeScript & Code Quality

**Mandatory Compilation Checks:**
```bash
# Run during development (after each significant change)
npx tsc --noEmit           # TypeScript compilation check
npx convex dev --once      # Convex typecheck + schema validation
```

**TypeScript Configuration (tsconfig.json):**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["convex/**/*", "mcp-server/src/**/*"],
  "exclude": ["node_modules", "convex/_generated"]
}
```

**ESLint Configuration (.eslintrc.json):**
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

### Function Visibility Standards

**Critical Rule:** Function visibility is determined by **where it's called from**, not what it does.

| Called From | Use | Import Via |
|-------------|-----|------------|
| MCP Server | `action`, `mutation`, `query` | `api.module.function` |
| React Client | `action`, `mutation`, `query` | `api.module.function` |
| Other Convex Functions | `internalAction`, `internalMutation`, `internalQuery` | `internal.module.function` |
| HTTP Endpoints | `httpAction` | httpRouter registration |
| Cron Jobs | Either public or internal | `api.*` or `internal.*` |

**Common Anti-Pattern (from Sprint-002 Hotfixes):**
```typescript
// ❌ WRONG: MCP server tries to call internal function
export const createNode = internalAction({  // This blocks MCP access
  handler: async (ctx, args) => { ... }
});

// MCP server call fails:
await client.action(api.graph.createNode, args);  // Error: "Could not find public function"

// ✅ CORRECT: Public function for MCP access
export const createNode = action({  // MCP can now access this
  args: {
    name: v.string(),
    type: v.union(v.literal("project"), v.literal("tool"), v.literal("skill")),
    description: v.optional(v.string())
  },
  handler: async (ctx, args): Promise<string> => {
    // Generate embedding via internal helper
    const embedding = await ctx.runAction(internal.graph.generateNodeEmbedding, {
      text: `${args.name} ${args.description || ""}`
    });
    
    // Insert node via internal mutation
    return await ctx.runMutation(internal.graph.insertNode, {
      ...args,
      embedding
    });
  }
});

// Internal helper - only callable from Convex functions
export const generateNodeEmbedding = internalAction({
  args: { text: v.string() },
  handler: async (ctx, args): Promise<number[]> => {
    // External API call (protected from public access)
    const result = await voyageEmbed(args.text, "voyage-4");
    return result;
  }
});
```

### Argument Validation Requirements

**MANDATORY for all public functions:**
```typescript
import { v } from "convex/values";

// ✅ CORRECT: Complete validation
export const addItem = action({
  args: {
    content: v.string(),
    category: v.string(),
    metadata: v.optional(v.object({
      tags: v.array(v.string()),
      priority: v.number()
    }))
  },
  returns: v.string(),  // Return type validator
  handler: async (ctx, args): Promise<string> => {
    // Type-safe implementation
    return itemId;
  }
});

// ❌ WRONG: Missing validators
export const addItem = action({
  args: {},  // Missing validation - security risk!
  handler: async (ctx, args) => {  // 'args' has implicit 'any' type
    return itemId;
  }
});
```

**Optional for internal functions** (but recommended):
```typescript
export const insertItem = internalMutation({
  args: {  // Still good practice
    content: v.string(),
    embedding: v.array(v.float64())
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("items", args);
  }
});
```

---

## Pre-Deployment Validation Checklist

### Definition of Done - Technical Validation (MANDATORY)

Every story must complete ALL items with evidence before "Done" status:

```markdown
- [ ] **TypeScript Compilation**
  - Command: `npx tsc --noEmit`
  - Status: ✅ 0 errors
  - Evidence: [Screenshot or console output link]
  
- [ ] **Convex Type Check**
  - Command: `npx convex dev --once`
  - Status: ✅ "Convex functions ready!"
  - Evidence: [Screenshot showing successful deployment]
  
- [ ] **Function Visibility Audit**
  - All `action`/`mutation`/`query` functions called from MCP/client
  - All `internalAction`/`internalMutation`/`internalQuery` called via `internal.*`
  - No mixing of public/internal call patterns
  - Evidence: [Checklist with function names and visibility confirmed]
  
- [ ] **Argument Validators**
  - All public functions have `args` validation
  - All public functions have `returns` validation (or `v.null()`)
  - Evidence: [Code review checklist]
  
- [ ] **External API Validation** (if applicable)
  - API endpoints tested with real credentials
  - Model names verified against current documentation
  - Response structure matches code expectations
  - Rate limits tested
  - Evidence: [API response logs with status codes]
  
- [ ] **Schema Validation** (if schema changes)
  - Schema migration tested on dev deployment
  - Index dimensions match embedding model (voyage-4 = 1024)
  - No breaking changes to existing data
  - Evidence: [Convex dashboard screenshot showing migration]

- [ ] **Tests Pass**
  - Unit tests: `npm test`
  - Integration tests (if applicable)
  - External API tests (if applicable)
  - Evidence: [Test output or coverage report]
```

**Enforcement:**
- Scrum Master validates ALL evidence before approving "Done"
- Missing evidence → Task reverts to "In Progress"
- **NO EXCEPTIONS** - Quality over velocity

---

## CI/CD Pipeline Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/convex-validation.yml
name: Convex Validation

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

env:
  NODE_VERSION: '18'

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: TypeScript compilation check
        run: npx tsc --noEmit
      
      - name: Convex code generation
        run: npx convex codegen
        env:
          CONVEX_DEPLOYMENT: ${{ secrets.CONVEX_DEV_DEPLOYMENT }}
      
      - name: Convex typecheck
        run: npx convex dev --once --typecheck-only
        env:
          CONVEX_DEPLOYMENT: ${{ secrets.CONVEX_DEV_DEPLOYMENT }}

  test:
    runs-on: ubuntu-latest
    needs: typecheck
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  preview-deployment:
    runs-on: ubuntu-latest
    needs: [typecheck, test]
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Deploy preview
        run: npx convex deploy --preview-name "${{ github.head_ref }}"
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}

  production-deployment:
    runs-on: ubuntu-latest
    needs: [typecheck, test]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Deploy to production
        run: npx convex deploy --prod
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY_PROD }}
```

---

## External API Monitoring

### Voyage AI Embedding Model Standards

**Current Model (as of January 2026):**
- Model: `voyage-4` (standard embeddings)
- Dimensions: 1024
- Cost: $0.02/1M tokens
- API: `https://api.voyageai.com/v1/embeddings`

**Schema Configuration:**
```typescript
// convex/schema.ts
export default defineSchema({
  items: defineTable({
    content: v.string(),
    embedding: v.array(v.float64()),  // 1024 dimensions for voyage-4
    // ...
  }).vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1024,  // MUST match model output
    filterFields: ["category"],
  }),

  graphNodes: defineTable({
    name: v.string(),
    embedding: v.array(v.float64()),  // 1024 dimensions
    // ...
  }).vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1024,
    filterFields: ["type"],
  }),
});
```

**Validation Test:**
```typescript
// __tests__/external-apis.test.ts
import { describe, it, expect } from "vitest";
import { voyageEmbed } from "../convex/lib/voyage";

describe("Voyage AI Validation", () => {
  it("voyage-4 model returns 1024 dimensions", async () => {
    const embedding = await voyageEmbed("Test text", "voyage-4");
    
    expect(embedding).toBeDefined();
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding).toHaveLength(1024);
    expect(embedding.every(n => typeof n === "number")).toBe(true);
  });
  
  it("rejects deprecated voyage-context-3", async () => {
    await expect(
      voyageEmbed("Test", "voyage-context-3")
    ).rejects.toThrow(/not supported/);
  });
});
```

**Monthly Review Checklist:**
```markdown
### External API Health Check (Run on 1st of each month)

- [ ] **Voyage AI**
  - Check docs: https://docs.voyageai.com/docs/embeddings
  - Verify supported models: voyage-4, voyage-4-large, voyage-4-lite
  - Test embedding call with real API key
  - Confirm dimensions: 1024 (standard), 2048 (large)
  - Last verified: [DATE]

- [ ] **Gemini (if used for extraction)**
  - Check docs: https://ai.google.dev/gemini-api/docs
  - Verify model names: gemini-2.0-flash-exp, etc.
  - Test extraction call
  - Last verified: [DATE]

- [ ] **Update CLAUDE.md**
  - Document any API changes
  - Update code examples
  - Add deprecation warnings
```

---

## Testing Strategy

### Unit Tests (Convex Functions)

```typescript
// convex/items.test.ts
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";

test("addItem creates item with embedding", async () => {
  const t = convexTest(schema);
  
  // Mock external API call
  t.registerAction(internal.items.generateEmbedding, async () => {
    return new Array(1024).fill(0.1);  // Mock voyage-4 embedding
  });
  
  const itemId = await t.run(async (ctx) => {
    return await ctx.run(api.items.addItem, {
      content: "Test item",
      category: "test"
    });
  });
  
  expect(itemId).toBeDefined();
  
  const item = await t.run(async (ctx) => {
    return await ctx.db.get(itemId);
  });
  
  expect(item).toMatchObject({
    content: "Test item",
    category: "test"
  });
  expect(item.embedding).toHaveLength(1024);
});

test("internal function not callable from public API", async () => {
  const t = convexTest(schema);
  
  await expect(
    t.run(async (ctx) => {
      // This should fail - trying to call internal via api.*
      return await ctx.run(api.items.generateEmbedding, { text: "test" });
    })
  ).rejects.toThrow();
});
```

### Integration Tests (MCP Server)

```typescript
// mcp-server/__tests__/handlers.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { ConvexClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

describe("MCP Handlers - Graph Functions", () => {
  let client: ConvexClient;
  
  beforeAll(() => {
    client = new ConvexClient(process.env.CONVEX_URL!);
  });
  
  it("should create node via public action", async () => {
    const nodeId = await client.action(api.graph.createNode, {
      name: "Test Node",
      type: "concept",
      description: "Integration test"
    });
    
    expect(nodeId).toBeDefined();
    expect(typeof nodeId).toBe("string");
  });
  
  it("should NOT access internal function", async () => {
    await expect(
      client.action(api.graph.generateNodeEmbedding, { text: "test" })
    ).rejects.toThrow(/Could not find public function/);
  });
});
```

---

## Development Workflow

### Per-Story Checklist

```bash
# 1. Create function with CORRECT visibility from start
#    - MCP-callable? Use action/mutation/query
#    - Internal only? Use internalAction/internalMutation/internalQuery

# 2. Add validators immediately
#    - args: { ... }
#    - returns: v.string() or v.null()

# 3. Continuous validation (after each change)
npx tsc --noEmit
# Keep `npx convex dev` running in separate terminal

# 4. Test in Convex dashboard
#    - Navigate to Functions tab
#    - Run with test data
#    - Verify logs

# 5. Pre-commit validation
git add .
npx tsc --noEmit && npx convex dev --once
git commit -m "feat: implement story"
```

### Pre-Commit Hook (Husky)

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Pre-commit checks..."

echo "📝 TypeScript..."
npx tsc --noEmit || exit 1

echo "🔧 Convex..."
npx convex dev --once || exit 1

echo "🔍 ESLint..."
npx eslint . --ext .ts,.tsx || exit 1

echo "✅ All checks passed!"
```

---

## Quick Reference

### Command Cheat Sheet

```bash
# Development
npx convex dev                    # Start dev server (keep running)
npx convex dev --once             # One-time typecheck
npx tsc --noEmit                  # TypeScript check

# Deployment
npx convex deploy                 # Deploy to production
npx convex deploy --preview-name "branch"  # Preview deployment

# Testing
npm test                          # Run all tests
npm run test:external-apis        # Validate APIs

# Dashboard
npx convex dashboard              # Open dashboard
npx convex logs                   # View logs
```

### Function Visibility Quick Check

```typescript
// ✅ MCP Server Access
export const myFunction = action({...});        // MCP ✅
export const myFunction = mutation({...});      // MCP ✅
export const myFunction = query({...});         // MCP ✅

// ✅ Internal Only
export const myHelper = internalAction({...});  // MCP ❌
export const myHelper = internalMutation({...});// MCP ❌
export const myHelper = internalQuery({...});   // MCP ❌

// Call patterns
// From MCP: await client.action(api.module.func, args)
// From Convex: await ctx.runAction(internal.module.func, args)
```

---

**References:**
- [Convex Best Practices](https://docs.convex.dev/understanding/best-practices/)
- [Sprint 002 Hotfix Analysis](.scrum/sprints/sprint-002/HOTFIX-001.md)
- [Complete Best Practices Guide](.scrum/sprints/sprint-002/convex-development-best-practices.md)