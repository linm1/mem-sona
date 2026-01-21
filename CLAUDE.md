# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mem-sona** is a personal memory infrastructure for AI coding agents (Claude Code, GitHub Copilot, Cursor). It enables persistent, evolving knowledge about the user across sessions by combining file-based categorical memory with a knowledge graph for relationship mapping.

**Status**: Core implementation complete (Sprint-003)

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend/DB | Convex |
| Vector Search | Convex Vector Index (**1024 dimensions**) |
| Embeddings | **voyage-4** (standard embeddings, 1024-dim) |
| LLM Processing | gemini-3-flash-preview |
| Agent Interface | MCP Server (TypeScript) |
| Dashboard (optional) | Next.js + Tailwind |

## Project Structure

```
mem-sona/
├── convex/               # Backend functions, database schema
│   ├── schema.ts         # Full data model (file + graph)
│   ├── resources.ts      # Raw log storage
│   ├── items.ts          # Atomic fact CRUD + vector search
│   ├── categories.ts     # Summary evolution
│   ├── graph.ts          # Node/edge CRUD, traversal queries
│   ├── extraction.ts     # LLM-based fact + entity extraction
│   ├── retrieval.ts      # Hybrid search implementation
│   ├── maintenance.ts    # Cron job handlers
│   ├── crons.ts          # Scheduled job definitions
│   └── utils/            # Shared utilities (NEW)
│       ├── gemini.ts     # Gemini API retry logic + JSON parsing
│       ├── voyage.ts     # Voyage AI embedding utilities
│       ├── math.ts       # Mathematical operations (cosine similarity, etc.)
│       └── constants.ts  # Centralized configuration constants
├── mcp-server/           # MCP server for Claude Code, Copilot, Cursor
│   └── src/
│       ├── index.ts      # MCP server entry
│       ├── tools.ts      # Tool definitions
│       ├── handlers.ts   # Tool implementations
│       └── types.ts      # Type definitions for tool arguments (NEW)
├── web/                  # Optional Next.js dashboard
└── PRD_mem-sona.md       # Product Requirements Document
```

## Shared Utilities

### Voyage AI Utilities (`convex/utils/voyage.ts`)

**ALWAYS use these utilities for embedding generation.** Do NOT create new VoyageAI client instances elsewhere.

```typescript
import { generateEmbedding, generateNodeEmbedding, VOYAGE_CONFIG } from "./utils/voyage";

// For text embeddings (items, queries)
const embedding = await generateEmbedding(text, "document"); // or "query" for search
// Returns: number[] (1024 dimensions)

// For graph node embeddings
const embedding = await generateNodeEmbedding(name, type, description);
// Returns: number[] (1024 dimensions)

// Access config constants
VOYAGE_CONFIG.model      // "voyage-4"
VOYAGE_CONFIG.dimensions // 1024
```

**Key exports:**
- `VOYAGE_CONFIG` - Centralized config (model name, dimensions)
- `createVoyageClient()` - Creates configured client (throws if no API key)
- `generateEmbedding(text, inputType)` - Standard text embedding
- `generateNodeEmbedding(name, type, description)` - Graph node embedding

### Gemini Utilities (`convex/utils/gemini.ts`)

**ALWAYS use these utilities for Gemini API calls.** Provides retry logic and JSON parsing.

```typescript
import { callGeminiWithRetry, parseGeminiJson, MAX_RETRIES } from "./utils/gemini";

// Call Gemini with automatic retry (exponential backoff)
const responseText = await callGeminiWithRetry(model, prompt);

// Parse JSON from Gemini response (handles ```json code blocks)
const result = parseGeminiJson<MyType>(responseText);
```

**Key exports:**
- `MAX_RETRIES` - Default retry attempts (3)
- `RETRY_DELAY_BASE` - Base delay in ms (1000)
- `callGeminiWithRetry(model, prompt, retries?)` - Retries with exponential backoff
- `parseGeminiJson<T>(responseText)` - Parses JSON, strips markdown code blocks

### Math Utilities (`convex/utils/math.ts`)

**ALWAYS use these utilities for vector operations.** Do NOT reimplement mathematical functions elsewhere.

```typescript
import { cosineSimilarity } from "./utils/math";

// Calculate cosine similarity between two embedding vectors
const similarity = cosineSimilarity(embedding1, embedding2);
// Returns: number between -1 and 1
// 1 = identical, 0 = orthogonal, -1 = opposite
```

**Key exports:**
- `cosineSimilarity(vecA, vecB)` - Calculates cosine similarity between two vectors
  - Returns score between -1 and 1
  - Throws error if vector dimensions don't match
  - Used for duplicate detection, semantic similarity

### Configuration Constants (`convex/utils/constants.ts`)

**ALWAYS use these constants for time thresholds and configuration.** Do NOT use inline calculations or magic numbers.

```typescript
import {
  TIME_CONSTANTS,
  EDGE_WEIGHT_CONFIG,
  SEARCH_CONFIG,
  PERFORMANCE_CONFIG,
  msToDays,
  daysToMs,
} from "./utils/constants";

// Time thresholds
const isStale = (Date.now() - timestamp) > TIME_CONSTANTS.NINETY_DAYS_MS;
const daysSinceUpdate = msToDays(Date.now() - node.updatedAt);

// Edge weight decay
const decayedWeight = weight * Math.pow(EDGE_WEIGHT_CONFIG.DECAY_RATE, decayPeriods);
if (decayedWeight < EDGE_WEIGHT_CONFIG.MIN_THRESHOLD) { /* archive */ }

// Search configuration
const filtered = results.filter(r => r.score > SEARCH_CONFIG.RELEVANCE_THRESHOLD);
if (similarity > SEARCH_CONFIG.SIMILARITY_THRESHOLD) { /* duplicate */ }

// Performance tuning
await new Promise(resolve => setTimeout(resolve, PERFORMANCE_CONFIG.REINDEX_DELAY_MS));
```

**Key exports:**
- `TIME_CONSTANTS` - Time thresholds for maintenance operations
  - `SEVEN_DAYS_MS`: Hot memory detection window (604800000ms)
  - `THIRTY_DAYS_MS`: Item summarization, edge decay period (2592000000ms)
  - `NINETY_DAYS_MS`: Orphan node archival, item deletion (7776000000ms)
  - `ONE_EIGHTY_DAYS_MS`: Item reindexing threshold (15552000000ms)
- `EDGE_WEIGHT_CONFIG` - Graph edge weight decay settings
  - `DECAY_RATE`: 0.9 (10% decay per 30-day period)
  - `MIN_THRESHOLD`: 0.1 (archive edges below this weight)
- `SEARCH_CONFIG` - Search and retrieval configuration
  - `RELEVANCE_THRESHOLD`: 0.7 (minimum score for search results)
  - `SIMILARITY_THRESHOLD`: 0.95 (duplicate detection threshold)
  - `TIME_DECAY_HALFLIFE_DAYS`: 30 (half-life for time-decay scoring)
  - `HOT_MEMORY_ACCESS_THRESHOLD`: 2 (minimum accesses for hot memory)
- `PERFORMANCE_CONFIG` - Performance tuning constants
  - `REINDEX_DELAY_MS`: 10 (delay between reindexing operations)
- `msToDays(ms)` - Convert milliseconds to days (for logging/display)
- `daysToMs(days)` - Convert days to milliseconds (for dynamic thresholds)

### MCP Type Definitions & Validation (`mcp-server/src/types.ts`)

**ALWAYS use these types and validators for MCP tool arguments.** Provides type safety and runtime validation.

```typescript
import {
  validateArgs,
  validators,
  type MemorySearchArgs,
  type MemoryAddFactArgs,
  type MemoryGetContextArgs,
  type MemoryLogSessionArgs,
  type MemoryAddEntityArgs,
  type MemoryAddRelationshipArgs,
  type MemoryGetProjectArgs,
  VALID_ENTITY_TYPES,
  isValidEntityType,
} from "./types.js";

// Runtime validation with proper type safety
const validated = validateArgs<MemorySearchArgs>(
  args,
  "MemorySearchArgs",
  validators.memorySearch
);

// Validate entity type
if (!isValidEntityType(type)) {
  // Handle invalid type
}
```

**Key exports:**
- `MemorySearchArgs`, `MemoryAddFactArgs`, etc. - Type definitions for each tool
- `validateArgs<T>(args, typeName, validator)` - Runtime validation helper (replaces `as unknown as` casts)
- `validators` - Object containing validation functions for each argument type
  - `validators.memorySearch`, `validators.memoryAddFact`, etc.
  - Each validator performs runtime type checking on required fields
- `VALID_ENTITY_TYPES` - Array of valid entity types: `["project", "tool", "skill", "concept"]`
- `isValidEntityType(type)` - Type guard for entity type validation

**Argument Validation Pattern:**

Instead of unsafe type assertions (`as unknown as`), use the `validateArgs` helper:

```typescript
// ❌ WRONG - Bypasses type checking
const result = await handler(args as unknown as MemorySearchArgs);

// ✅ CORRECT - Runtime validation with proper error handling
const validated = validateArgs<MemorySearchArgs>(
  args,
  "MemorySearchArgs",
  validators.memorySearch
);
const result = await handler(validated);
```

**How validateArgs Works:**
1. Checks if `args` is an object (not null, undefined, or primitive)
2. Runs custom validator function to check required fields and types
3. Throws descriptive error if validation fails
4. Returns properly typed arguments if validation succeeds

**Benefits:**
- Runtime type safety (catches invalid arguments before handlers execute)
- Better error messages (specific validation failures)
- Type safety without unsafe casts
- Easier debugging (validation errors thrown early)

## Critical API Integration Requirements

### Voyage AI voyage-4 Standard Embeddings

**MODEL STATUS:** voyage-4 is the **LATEST GENERATION** standard embedding model (as of Jan 2026).

**CRITICAL:** voyage-context-3 was **DEPRECATED/REMOVED** by Voyage AI API in January 2026. The API now rejects voyage-context-3 with a 400 error. This project has migrated to voyage-4 standard embeddings.

**Why voyage-4?**
- Latest generation (better quality than voyage-2)
- Standard embeddings (simpler API than contextualized)
- 1024 dimensions by default (well-supported, efficient)
- Supports shared embedding space with voyage-4-lite and voyage-4-large
- Excellent retrieval quality for semantic search

**voyage-4 Specifications:**
- **Supported Dimensions:** 256, 512, **1024** (default), 2048
- **Input Structure:** `input: string` OR `input: string[]` (simple, not nested arrays)
- **Method:** `client.embed()` (standard embeddings)
- **Response Path:** `result.data[0].embedding` (single-level, not nested)
- **Token Limit:** Up to 320K tokens total per request

**MANDATORY Implementation Pattern:**

```typescript
import { VoyageAIClient } from "voyageai";

const client = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });

// For single text embedding:
const result = await client.embed({
  input: text,                   // Simple string input (NOT nested arrays)
  model: "voyage-4",             // Latest generation standard embeddings
  inputType: "document",         // or "query" for search queries
  outputDimension: 1024,         // Default dimension (also supports 256, 512, 2048)
});

// Extract embedding (simple path):
const embedding = result.data[0].embedding;

// For batch embeddings (multiple texts):
const result = await client.embed({
  input: ["text1", "text2", "text3"],  // Array of strings (NOT nested)
  model: "voyage-4",
  inputType: "document",
  outputDimension: 1024,
});

// Access each embedding:
result.data.forEach((item, idx) => {
  const textEmbedding = item.embedding;  // Each text's embedding
});
```

**inputType Parameter:**
- `"document"`: Use when storing text for retrieval (optimized for documents)
- `"query"`: Use when text is a search query (optimized for queries)
- `null`: Default, no optimization

**Alternative Models (if needed):**
- **voyage-4-large:** 1536 dimensions (higher accuracy, slower, more expensive)
- **voyage-4-lite:** 1024 dimensions (faster inference, lower cost, compatible with voyage-4)
- **voyage-2:** 1024 dimensions (previous generation, stable)

**MANDATORY Before ANY Embedding Integration:**
1. ✅ Use `client.embed()` method for standard embeddings (voyage-4, voyage-2)
2. ✅ Use 1024 dimensions (default for voyage-4)
3. ✅ Structure input as `input: text` (simple string, NOT nested arrays)
4. ✅ Extract embedding from `result.data[0].embedding` (single-level response)
5. ✅ Test with real API call before marking "Done"
6. ✅ Verify response structure matches expected format

### voyage-4 Integration Checklist (MANDATORY)

**Use this checklist for ALL voyage-4 implementations:**

**Schema Configuration:**
- [ ] Vector index dimension set to **1024** (default)
- [ ] Embedding field type: `v.array(v.float64())`
- [ ] Index configured: `dimensions: 1024`

**Code Implementation:**
- [ ] Using `client.embed()` method (for standard embeddings)
- [ ] Input structure: `input: text` (simple string, NOT nested arrays)
- [ ] Model: `"voyage-4"` (latest generation)
- [ ] Output dimension: `1024` (default, or 256/512/2048 if needed)
- [ ] inputType: `"document"` for storage, `"query"` for search

**Response Handling:**
- [ ] Extracting embedding from correct path: `result.data[0].embedding`
- [ ] Handling missing/empty responses with error check
- [ ] TypeScript types match SDK: `EmbedResponse`

**Testing (MANDATORY - No Exceptions):**
- [ ] Real API call tested with actual VOYAGE_API_KEY
- [ ] Response structure verified (single-level data array)
- [ ] Embedding dimension verified (should be 1024)
- [ ] Error cases tested (invalid key, empty input, rate limits)
- [ ] Logged actual API response for verification

**Documentation:**
- [ ] Code comments explain why voyage-4 (voyage-context-3 deprecated)
- [ ] Dimension choice documented (why 1024)
- [ ] inputType usage documented ("document" vs "query")

**Common Mistakes to Avoid:**
- ❌ Using `client.contextualizedEmbed()` - This is for voyage-context-3 (deprecated)
- ❌ Using `inputs: [[text]]` - Standard embeddings use `input: text` (simple string)
- ❌ Using wrong model name (voyage-context-3) - Model was deprecated in Jan 2026
- ❌ Skipping real API testing - Must test with actual endpoint before "Done"

### External API Integration Checklist

**MANDATORY for all external API integrations:**

**1. Before Implementation:**
- [ ] Check npm for official SDK (never use raw fetch if SDK exists)
- [ ] Read model-specific API documentation (not just general docs)
- [ ] Verify API version and model availability with real test call
- [ ] Confirm dimension/parameter compatibility

**2. During Implementation:**
- [ ] Use official SDK with TypeScript types
- [ ] Add explicit error handling for API failures
- [ ] Document API version, model name, parameters used in code
- [ ] Test with real API endpoint (not mocks or assumptions)

**3. Before Marking "Done":**
- [ ] Real API call test passes with production-like data
- [ ] Dimension requirements validated against actual API response
- [ ] Error cases tested (invalid key, rate limits, timeouts)
- [ ] API integration verified in pre-deployment checklist

**Why This Matters:**
- Sprint-001: Used wrong SDK method (contextualizedEmbed for voyage-context-3)
- Sprint-002: Same errors repeated - wrong model and wrong dimensions
- Sprint-003 (Jan 2026): voyage-context-3 DEPRECATED - migrated to voyage-4
- Root cause: API documentation not properly researched, models change without notice

**Common Errors to Avoid:**

```typescript
// ❌ WRONG - Using deprecated model
const result = await client.embed({
  input: text,
  model: "voyage-context-3",  // Model deprecated Jan 2026!
  outputDimension: 1536,      // Not supported by voyage-4
});

// ❌ WRONG - Using contextualized method with standard model
const result = await client.contextualizedEmbed({
  inputs: [[text]],           // Wrong input structure for voyage-4
  model: "voyage-4",
  outputDimension: 1024,
});

// ✅ CORRECT - Using voyage-4 standard embeddings
const result = await client.embed({
  input: text,                // Simple string input
  model: "voyage-4",          // Latest generation model
  inputType: "document",      // Optimization hint
  outputDimension: 1024,      // Default dimension
});
const embedding = result.data[0].embedding;
```

**Schema Requirements:**
- Vector index must use **1024 dimensions** (voyage-4 default)
- Update `convex/schema.ts` if using different dimension
- All embeddings in the same index must use same dimension

## Development Commands

```bash
# Install Convex CLI
npm install -g convex

# Initialize Convex project
npx convex init

# Start Convex development server
npx convex dev

# Deploy to production
npx convex deploy

# Run MCP server (after building)
cd mcp-server && npm run build && node dist/index.js

# TypeScript compilation checks (MANDATORY before commits)
cd convex && npx tsc --noEmit       # Check Convex backend
cd mcp-server && npx tsc --noEmit   # Check MCP server
```

## Development Workflow

### Before Making Changes

1. **Read relevant files first** - Never modify code you haven't read
2. **Check shared utilities** - Use existing utilities in `convex/utils/` and `mcp-server/src/types.ts`
3. **Understand patterns** - Review similar existing code for consistency

### When Adding New Features

1. **Use shared utilities** - Don't duplicate Gemini/Voyage/type validation logic
2. **Add explicit types** - All handler return types, array types, callback parameters
3. **Follow error patterns** - Result objects for graceful degradation, throws for critical failures
4. **Update constants** - Add new constants to the "Important Constants" table above

### Before Committing

1. **TypeScript compilation** - Run `npx tsc --noEmit` in both `convex/` and `mcp-server/`
2. **No implicit any** - Fix all type errors before committing
3. **Update CLAUDE.md** - Document new utilities, constants, or patterns

## Mandatory Quality Gates

### Pre-Deployment Checklist

**CRITICAL:** The pre-deployment checklist (`.scrum/pre-deployment-checklist.md`) is **MANDATORY**, not optional.

**Sprint CANNOT be marked "Complete" until:**
1. ✅ All 55 checklist items executed and checked off
2. ✅ Real API testing completed for all external integrations
3. ✅ TypeScript compilation passes: `npx tsc --noEmit`
4. ✅ Convex deployment test: `npx convex dev --once`
5. ✅ Scrum Master + Developer sign-off on checklist

**Process Enforcement:**
- Developer marks tasks "Done" → Scrum Master validates checklist
- Checklist incomplete → Task reverts to "In Progress"
- No exceptions - validation gates are non-negotiable

**Why This Matters:**
- Sprint-001: Pre-deployment checklist created but NOT executed
- Sprint-002: All 55 items left unchecked, same issues repeated
- Root cause: Documents created without enforcement mechanisms

### Definition of Done Enforcement

**"Done" means:**
- ✅ Code written AND verified
- ✅ TypeScript compilation passes (`npx tsc --noEmit`)
- ✅ Real API testing completed (if applicable)
- ✅ Pre-deployment checklist items verified
- ✅ Documentation updated with correct information
- ✅ Integration tested end-to-end

**NOT "Done":**
- ❌ Code written but not compiled
- ❌ API integration without real endpoint testing
- ❌ Checklist created but not executed
- ❌ Documentation exists but contains errors
- ❌ Tests pass locally but deployment will fail

**Evidence Required:**
- API testing: Logs showing real API responses
- Compilation: Screenshot or log of `npx tsc --noEmit` passing
- Integration: End-to-end test results

## Code Patterns & Constants

### Important Constants

All system constants are centralized in `convex/utils/constants.ts` for easy maintenance. Import them instead of using inline calculations.

| Constant | Location | Value | Purpose |
|----------|----------|-------|---------|
| `TIME_CONSTANTS.SEVEN_DAYS_MS` | `utils/constants.ts` | 604800000 | Hot memory detection window |
| `TIME_CONSTANTS.THIRTY_DAYS_MS` | `utils/constants.ts` | 2592000000 | Item summarization, edge decay period |
| `TIME_CONSTANTS.NINETY_DAYS_MS` | `utils/constants.ts` | 7776000000 | Orphan node archival, item deletion |
| `TIME_CONSTANTS.ONE_EIGHTY_DAYS_MS` | `utils/constants.ts` | 15552000000 | Item reindexing threshold |
| `EDGE_WEIGHT_CONFIG.DECAY_RATE` | `utils/constants.ts` | 0.9 | Edge weight decay per 30-day period |
| `EDGE_WEIGHT_CONFIG.MIN_THRESHOLD` | `utils/constants.ts` | 0.1 | Archive edges below this weight |
| `SEARCH_CONFIG.RELEVANCE_THRESHOLD` | `utils/constants.ts` | 0.7 | Minimum score for search results |
| `SEARCH_CONFIG.SIMILARITY_THRESHOLD` | `utils/constants.ts` | 0.95 | Duplicate detection threshold |
| `SEARCH_CONFIG.TIME_DECAY_HALFLIFE_DAYS` | `utils/constants.ts` | 30 | Half-life for time-decay scoring |
| `SEARCH_CONFIG.HOT_MEMORY_ACCESS_THRESHOLD` | `utils/constants.ts` | 2 | Minimum accesses for hot memory |
| `PERFORMANCE_CONFIG.REINDEX_DELAY_MS` | `utils/constants.ts` | 10 | Delay between reindexing operations |
| `VOYAGE_CONFIG.dimensions` | `utils/voyage.ts` | 1024 | Embedding vector dimensions |
| `VOYAGE_CONFIG.model` | `utils/voyage.ts` | "voyage-4" | Embedding model name |
| `MAX_RETRIES` | `utils/gemini.ts` | 3 | Gemini API retry attempts |
| `RETRY_DELAY_BASE` | `utils/gemini.ts` | 1000 | Base retry delay (ms) |
| `VALID_ENTITY_TYPES` | `graph.ts`, `mcp/types.ts` | ["project", "tool", "skill", "concept"] | Allowed node types |

### Error Handling Patterns

**Result Object Pattern (for graceful degradation):**
Used when failures are expected and should not crash pipelines.

```typescript
// Example: extraction.ts - ExtractionResult
interface ExtractionResult {
  facts: ExtractedFact[];
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  success: boolean;  // Check this before using results
  error?: string;    // Error message if success is false
}

// Caller handles failure gracefully
const result = await extractFacts(content);
if (!result.success) {
  console.error(result.error);
  // Continue processing other items
}
```

**Throwing Pattern (for critical failures):**
Used when failures should stop execution.

```typescript
// Example: Voyage AI client creation
if (!apiKey) {
  throw new Error("VOYAGE_API_KEY not configured");
}
```

### TypeScript Type Annotations

**Always add explicit types for:**
1. Handler return types: `handler: async (ctx, args): Promise<ReturnType> =>`
2. Arrays from queries: `const items: Doc<"items">[] = await ctx.runQuery(...)`
3. Filter/map callbacks: `.filter((item: Doc<"items">) => ...)`
4. Function parameters in closures (TypeScript narrowing doesn't work in callbacks)

```typescript
// ✅ CORRECT - Explicit types
const items: Doc<"items">[] = await ctx.runQuery(internal.items.fetchItemsByIds, { itemIds });
const filtered = items.filter((item: Doc<"items">) => item.status === "active");

// ❌ WRONG - Implicit any
const items = await ctx.runQuery(internal.items.fetchItemsByIds, { itemIds });
const filtered = items.filter((item) => item.status === "active"); // item is any!
```

### Vector Search Pattern

**Vector search is only available in actions**, not queries. Use `internalAction` for vector search functions.

```typescript
// ✅ CORRECT - internalAction for vector search
export const vectorSearchInternal = internalAction({
  args: { embedding: v.array(v.float64()), ... },
  handler: async (ctx, args) => {
    const results = await ctx.vectorSearch("items", "by_embedding", {
      vector: args.embedding,
      limit: 20,
    });
    // ...
  },
});

// ❌ WRONG - internalQuery cannot do vector search
export const vectorSearchInternal = internalQuery({ ... });
```

## Architecture: Hybrid Memory Model

The system operates on two parallel tracks:

1. **File-Based Layer**: Resources → Items → Categories (for narrative coherence)
2. **Graph-Based Layer**: GraphNodes → GraphEdges (for relationship mapping)

**Key Patterns**:
- Hybrid retrieval: Vector search + graph traversal run in parallel, results merged
- Time-decay scoring: 30-day half-life on retrieval relevance
- Conflict resolution: Exclusive relationships (e.g., "works_at") archive previous edges
- Immutable audit trail: Archived rather than deleted for history preservation

## MCP Tools Exposed

- `memory_search` - Hybrid vector + graph retrieval
- `memory_get_context` - Task-relevant summaries
- `memory_add_fact` - Add atomic facts
- `memory_add_entity` - Add graph nodes
- `memory_add_relationship` - Create edges
- `memory_get_profile` - User profile summary
- `memory_get_project` - Project with tools/skills
- `memory_log_session` - Log conversations

## Implementation Phases

See `PRD_mem-sona.md` for detailed specifications:
- **Phase 1**: Core file-based memory (resources, items, categories)
- **Phase 2**: Graph layer (nodes, edges, traversal)
- **Phase 3**: Hybrid retrieval (parallel search, merging)
- **Phase 4**: Maintenance & polish (cron jobs, dashboard)

## Lessons Learned (Sprint-001 & Sprint-002)

### Critical Pattern: Documentation ≠ Enforcement

**What Happened:**
- Sprint-001: Created Definition of Done, Convex Standards, Pre-Deployment Checklist
- Sprint-002: Documents existed but **NOT ENFORCED**
- Result: Same API integration failure pattern repeated

**Root Cause:**
Process improvements were **documented but not made mandatory checkpoints**.

### Specific Lessons

#### 1. Voyage AI Contextualized Embeddings (CRITICAL)
- **Issue:** Used WRONG SDK method - `embed()` instead of `contextualizedEmbed()`
- **Dimension Mismatch:** Requested 1536-dim but voyage-context-3 only supports 256/512/1024/2048
- **Input Structure Error:** Used `input: "string"` instead of `inputs: [["string"]]`
- **Response Parsing Error:** Used wrong path to extract embedding from response
- **Impact:** Production deployment failed immediately with API errors
- **Prevention:**
  - Read model-specific API documentation (contextualized embeddings != standard embeddings)
  - Use correct SDK method: `contextualizedEmbed()` for voyage-context-3
  - Test with real API call to verify request/response structure
  - Use supported dimensions (1024 is default and recommended)
  - Verify response structure with actual API response before implementing

#### 2. Pre-Deployment Checklist Must Be Mandatory
- **Issue:** Checklist created but all items left unchecked (⬜)
- **Impact:** Blocked deployment, required emergency fixes
- **Prevention:**
  - Sprint cannot close without 100% checklist completion
  - Scrum Master validates checklist execution
  - Add sign-off requirement: Developer + SM + PO
  - Make checklist a blocking gate, not optional guidance

#### 3. Definition of Done Needs Teeth
- **Issue:** DoD said "API testing required" but no testing was done
- **Impact:** Deployed code targeting unsupported API models
- **Prevention:**
  - Make DoD a blocking gate, not a guideline
  - Evidence required for each DoD item (test logs, API responses)
  - Tasks revert to "In Progress" if DoD not met
  - No exceptions - quality over velocity

#### 4. API Integration Requires Real Testing
- **Issue:** No record of actual Voyage AI endpoint testing in Sprint-002
- **Impact:** Would discover failures only during production deployment
- **Prevention:**
  - Create dedicated "API Integration Testing" task
  - Log test results with actual API responses
  - Validate dimensions/parameters against real data
  - Test error scenarios (invalid keys, rate limits)
  - Document test results before marking "Done"

#### 5. Documentation Can Become Stale
- **Issue:** Pre-deployment checklist said "1536 for voyage-context-3" (incorrect)
- **Impact:** Validated against incorrect assumptions
- **Prevention:**
  - Regular review of process documents (monthly)
  - Cross-reference documentation with current API docs
  - Flag outdated information during sprint planning
  - Update docs when API changes detected

### Never Repeat These Mistakes

**Anti-Patterns to Avoid:**
- ❌ Creating process documents without enforcement mechanisms
- ❌ Marking APIs "Done" without real endpoint testing
- ❌ Assuming external APIs remain stable
- ❌ Skipping pre-deployment checklist to save time
- ❌ Treating DoD as guidelines instead of requirements
- ❌ Documenting best practices but not integrating into workflow
- ❌ Accepting "it compiled locally" as sufficient validation

**Always Do:**
- ✅ Test external APIs with real endpoints before "Done"
- ✅ Execute pre-deployment checklist as mandatory gate
- ✅ Verify API model availability before each sprint
- ✅ Make quality gates blocking, not optional
- ✅ Enforce Definition of Done with evidence requirement
- ✅ Document API versions, models, parameters in code
- ✅ Subscribe to changelogs for all external services
- ✅ Review process documents monthly for staleness
