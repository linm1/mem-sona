# mem-sona

**Personal Memory Infrastructure for AI Coding Agents**

A persistent, evolving knowledge system for Claude Code, GitHub Copilot, and Cursor that remembers your preferences, skills, and context across coding sessions.

---

## What is mem-sona?

mem-sona gives AI coding agents a **long-term memory** of you:

- 🧠 **Remembers** your coding preferences, tech stack, and projects
- 🔍 **Retrieves** relevant context when you need it
- 📝 **Learns** from your conversations automatically
- 🎯 **Evolves** summaries as your preferences change

---

## Quick Start

### 1. Prerequisites
- Node.js 18+
- Convex account (free tier works)
- API keys:
  - Google Gemini API key
  - Voyage AI API key

### 2. Deploy Backend
```bash
# Install dependencies
npm install

# Deploy to Convex
npx convex dev
```

### 3. Configure Environment Variables
In Convex Dashboard → Settings → Environment Variables:
```
GEMINI_API_KEY=your-gemini-key
VOYAGE_API_KEY=your-voyage-key
```

### 4. Build MCP Server
```bash
cd mcp-server
npm install
npm run build
```

### 5. Configure Claude Code
Add to `~/.config/claude/mcp_config.json`:
```json
{
  "mcpServers": {
    "mem-sona": {
      "command": "node",
      "args": ["/absolute/path/to/mem-sona/mcp-server/dist/index.js"],
      "env": {
        "CONVEX_URL": "https://your-deployment.convex.cloud"
      }
    }
  }
}
```

### 6. Start Using
```
"Remember that I prefer TypeScript strict mode"
"Search my memory for React patterns"
"Get context for debugging Node.js apps"
```

📖 **Full guide:** See [QUICKSTART.md](./QUICKSTART.md)

---

## Features

### 🔍 Vector Similarity Search
Find relevant facts using semantic search powered by Voyage AI embeddings (1536 dimensions).

### 🤖 Automatic Fact Extraction
Gemini 2.0 Flash extracts atomic facts from conversations automatically.

### 📊 Category Summarization
Facts organized into evolving summaries (work, skills, preferences, projects, etc.).

### 🔄 Conflict Resolution
When preferences change, the system prefers newer information and notes changes.

### 📝 Session Logging
Log entire coding sessions for background processing and learning.

---

## Architecture

```
┌─────────────────────────────────────────┐
│  Claude Code / Copilot / Cursor        │
│  (AI Coding Agent)                      │
└──────────────┬──────────────────────────┘
               │ MCP Protocol
               ▼
┌─────────────────────────────────────────┐
│  MCP Server (Local)                     │
│  - memory_search                        │
│  - memory_add_fact                      │
│  - memory_get_context                   │
│  - memory_log_session                   │
│  - memory_get_profile                   │
└──────────────┬──────────────────────────┘
               │ HTTPS
               ▼
┌─────────────────────────────────────────┐
│  Convex Backend (Cloud)                 │
│  ┌────────────────────────────────┐    │
│  │ Resources  (Session Logs)      │    │
│  │ Items      (Facts + Embeddings)│    │
│  │ Categories (Summaries)         │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌────────────────────────────────┐    │
│  │ Extraction  (Gemini 2.0 Flash) │    │
│  │ Embeddings  (Voyage AI)        │    │
│  │ Vector Search (Convex Index)   │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend/DB | Convex (TypeScript-native, real-time) |
| Vector Search | Convex Vector Index (1536 dimensions) |
| Embeddings | voyage-context-3 ($0.02/1M tokens) |
| LLM Processing | gemini-2.0-flash (extraction & summarization) |
| Agent Interface | MCP Server (TypeScript) |

---

## Available MCP Tools

### `memory_search`
Search your memory using vector similarity:
```
"Search my memory for TypeScript configuration tips"
```

### `memory_add_fact`
Manually add facts:
```
"Remember: I prefer using pnpm over npm"
```

### `memory_get_context`
Get task-relevant context:
```
"Get context for implementing authentication"
```

### `memory_log_session`
Log conversations for later processing:
```
"Log this session to my memory"
```

### `memory_get_profile`
View your memory profile:
```
"Show me my memory profile"
```

---

## Project Structure

```
mem-sona/
├── convex/              # Backend functions & schema
│   ├── schema.ts        # Database schema (5 tables)
│   ├── resources.ts     # Session log storage
│   ├── items.ts         # Facts + vector search
│   ├── categories.ts    # Summary evolution
│   └── extraction.ts    # Gemini fact extraction
├── mcp-server/          # MCP server for AI agents
│   └── src/
│       ├── index.ts     # Server entry point
│       ├── tools.ts     # Tool definitions
│       └── handlers.ts  # Convex integration
├── .scrum/              # Sprint artifacts
├── PRD_mem-sona.md      # Product Requirements
├── CLAUDE.md            # Development context
├── QUICKSTART.md        # Setup guide
└── README.md            # This file
```

---

## Development Status

**Phase 1:** ✅ **Complete** (Sprint 001)
- Core file-based memory system
- Vector search with embeddings
- LLM-based fact extraction
- Category summarization
- MCP server with 5 tools

**Phase 2:** 🔜 Planned
- Knowledge graph (entities + relationships)
- Graph traversal queries
- Relationship-aware retrieval

**Phase 3:** 🔜 Planned
- Hybrid retrieval (vector + graph)
- Time-decay relevance scoring
- Advanced context assembly

**Phase 4:** 🔜 Optional
- Next.js dashboard
- Visual memory browser
- Category management UI

---

## Examples

### Remembering Preferences
```
You: "Remember that I prefer Tailwind CSS over Bootstrap"
AI: [Stores in preferences category]

Later...
You: "Get context for styling a new component"
AI: [Retrieves] "Based on your preferences, I see you prefer Tailwind CSS..."
```

### Learning from Sessions
```
You: "How do I implement JWT authentication in Express?"
AI: [Helps with implementation]

You: "Log this session"
AI: [Logs conversation]

[Background: Gemini extracts facts like "User implemented JWT auth in Express with bcrypt"]

Later...
You: "Search my memory for authentication patterns"
AI: [Finds JWT implementation from previous session]
```

### Evolving Knowledge
```
Day 1: "Remember: I use Vue.js for frontend"
Day 30: "Remember: I switched to React for better ecosystem"

AI: [Updates summary]
→ "Previously used Vue.js, now prefers React for ecosystem benefits"
```

---

## Documentation

- **Quick Start:** [QUICKSTART.md](./QUICKSTART.md)
- **Full PRD:** [PRD_mem-sona.md](./PRD_mem-sona.md)
- **Development Context:** [CLAUDE.md](./CLAUDE.md)
- **Sprint Details:** [.scrum/sprints/sprint-001/](.scrum/sprints/sprint-001/)

---

## API Costs (Estimated)

| Service | Usage | Cost |
|---------|-------|------|
| Voyage AI | Embeddings | $0.02 per 1M tokens (~$0.01/day typical) |
| Gemini 2.0 Flash | Extraction | Free tier: 15 RPM, 1M TPM |
| Convex | Database + Functions | Free tier: 1GB storage, 1M function calls/month |

**Typical daily cost:** < $0.10 for moderate usage

---

## Contributing

This is a personal project (Sprint 001 complete), but issues and suggestions welcome!

### Reporting Issues
Please include:
- MCP server logs
- Convex function logs
- Steps to reproduce

---

## License

MIT License - See LICENSE file

---

## Acknowledgments

Built with:
- [Convex](https://convex.dev) - Backend platform
- [Voyage AI](https://voyageai.com) - Embeddings
- [Google Gemini](https://ai.google.dev) - LLM processing
- [MCP Protocol](https://modelcontextprotocol.io) - Agent integration

---

## Support

- **Documentation:** See docs above
- **Convex Dashboard:** https://dashboard.convex.dev
- **Issues:** GitHub Issues (if public repo)

---

**Built by kllkt using Claude Code** 🤖

Sprint 001 completed: January 19, 2026
