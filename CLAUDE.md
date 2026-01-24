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
