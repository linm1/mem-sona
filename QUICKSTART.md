# mem-sona Quick Start Guide

**Personal Memory Infrastructure for AI Coding Agents**

Now that you've configured your Convex URL and API keys, here's how to use mem-sona with Claude Code, GitHub Copilot, or Cursor.

---

## Prerequisites Completed ✅

You've already:
- ✅ Deployed Convex backend (`npx convex dev`)
- ✅ Set environment variables (GEMINI_API_KEY, VOYAGE_API_KEY, CONVEX_URL)
- ✅ Built the MCP server

---

## Step 1: Start the MCP Server

### Option A: Direct Execution
```bash
cd mcp-server
node dist/index.js
```

The server will:
- Connect to your Convex deployment
- Expose 5 memory tools via MCP protocol
- Listen on stdio for Claude Code/Copilot/Cursor

### Option B: Background Daemon (Recommended)
```bash
# Windows
cd mcp-server
start /B node dist/index.js

# Linux/Mac
cd mcp-server
node dist/index.js &
```

---

## Step 2: Configure Claude Code to Use MCP Server

### Edit Claude Code MCP Configuration

**File Location:** `~/.config/claude/mcp_config.json` (Linux/Mac) or `%APPDATA%\Claude\mcp_config.json` (Windows)

**Add this configuration:**
```json
{
  "mcpServers": {
    "mem-sona": {
      "command": "node",
      "args": [
        "C:\\Users\\kllkt\\Documents\\My Web Sites\\mem-sona\\mcp-server\\dist\\index.js"
      ],
      "env": {
        "CONVEX_URL": "https://your-deployment.convex.cloud"
      }
    }
  }
}
```

**Replace:**
- `C:\\Users\\kllkt\\...` with your actual absolute path to `mcp-server/dist/index.js`
- `https://your-deployment.convex.cloud` with your actual Convex URL

### Restart Claude Code
```bash
# Exit Claude Code and restart
claude-code
```

---

## Step 3: Verify MCP Server is Connected

In Claude Code, check that mem-sona tools are available:

```
You should see MCP tools:
- memory_search
- memory_add_fact
- memory_get_context
- memory_log_session
- memory_get_profile
```

---

## Available Memory Tools

### 🔍 `memory_search` - Search Your Memory
**Purpose:** Find relevant facts using vector similarity search

**Example Usage:**
```
"Search my memory for information about Python async patterns"
"What do I know about database optimization?"
"Find my preferences for TypeScript configuration"
```

**What it does:**
- Generates embedding for your query (via Voyage AI)
- Searches vector database for similar facts
- Returns ranked results with categories

---

### ➕ `memory_add_fact` - Store New Information
**Purpose:** Manually add atomic facts to your memory

**Example Usage:**
```
"Remember that I prefer using Tailwind CSS over Bootstrap"
"Store this fact: I work at Acme Corp as a Senior Engineer"
"Add to memory: My favorite debugging tool is Chrome DevTools"
```

**What it does:**
- Creates a resource entry (audit trail)
- Generates embedding (via Voyage AI)
- Stores fact in vector database
- Categorizes automatically

---

### 📄 `memory_get_context` - Get Task-Relevant Context
**Purpose:** Retrieve memory context relevant to a specific task

**Example Usage:**
```
"Get context for: implementing authentication in Next.js"
"Show me relevant memory for: optimizing database queries"
"What should I know before: refactoring this React component?"
```

**What it does:**
- Searches for task-relevant facts
- Groups results by category (skills, preferences, projects, etc.)
- Returns formatted markdown context

---

### 📝 `memory_log_session` - Log Conversations
**Purpose:** Store entire coding session conversations for later processing

**Example Usage:**
```
"Log this conversation to my memory"
"Save our discussion about API design patterns"
```

**What it does:**
- Stores raw conversation text
- Marks as unprocessed (for background extraction)
- Returns resource ID

**Background Processing:**
Later, a cron job will:
1. Extract facts from logged sessions (via Gemini)
2. Generate embeddings (via Voyage AI)
3. Update category summaries

---

### 👤 `memory_get_profile` - View Memory Profile
**Purpose:** Get a summary of recently accessed facts organized by category

**Example Usage:**
```
"Show me my memory profile"
"What does my memory system know about me?"
"Display my recent memory activity"
```

**What it does:**
- Fetches recently accessed facts
- Groups by category (work, skills, preferences, projects)
- Shows access counts and timestamps

---

## Typical Usage Workflows

### Workflow 1: Learning New Technology
```
You: "I'm learning Rust. What should I know?"
Claude: [Uses memory_search to find Rust-related facts]

You: "Remember that I prefer using cargo-watch for development"
Claude: [Uses memory_add_fact to store preference]

You: "Get context for implementing async Rust code"
Claude: [Uses memory_get_context to retrieve relevant knowledge]
```

### Workflow 2: Starting New Project
```
You: "Show me my memory profile"
Claude: [Uses memory_get_profile to display your skills/preferences]

You: "Get context for building a Next.js dashboard"
Claude: [Uses memory_get_context for Next.js + dashboard knowledge]

You: "Remember this project: dashboard-pro, Next.js 14, Tailwind, Supabase"
Claude: [Uses memory_add_fact to store project info]
```

### Workflow 3: Debugging Session
```
You: "Search my memory for debugging strategies"
Claude: [Uses memory_search for debugging knowledge]

[After successful debugging session]

You: "Log this conversation to memory"
Claude: [Uses memory_log_session to store session]

[Later, background job extracts: "User successfully debugged CORS issue using Chrome DevTools Network tab"]
```

---

## Understanding the Memory System

### How Facts Are Stored

1. **Raw Storage (Resources Table)**
   - Every conversation/fact stored as-is
   - Immutable audit trail
   - Timestamped with source agent

2. **Atomic Facts (Items Table)**
   - Extracted via Gemini LLM
   - Each fact has:
     - Content (text)
     - Category (auto-assigned)
     - Embedding (1536-dim vector via Voyage AI)
     - Confidence score (0-1)
     - Access tracking

3. **Category Summaries (Categories Table)**
   - Evolving summaries (not static)
   - Conflict resolution (newer info preferred)
   - Updated incrementally via Gemini

### Categories (Auto-Assigned)

Facts are categorized as:
- **work** - Job, employer, role, responsibilities
- **skills** - Programming languages, tools, frameworks
- **preferences** - Coding style, tool preferences, workflows
- **projects** - Current/past projects, tech stacks
- **goals** - Learning goals, career objectives
- **context** - Environmental setup, team practices
- **personal** - General personal information

---

## Monitoring Your Memory

### View in Convex Dashboard

1. Go to your Convex dashboard: `https://dashboard.convex.dev`
2. Select your deployment
3. View tables:
   - **resources** - Raw logs
   - **items** - Extracted facts with embeddings
   - **categories** - Summaries

### Check Memory Stats

Ask Claude Code:
```
"Show me my memory profile"
→ Displays categories, fact count, recent access
```

---

## Background Processing (Automated)

mem-sona includes automated background jobs (set up cron jobs in Convex):

### Fact Extraction Cron
**Runs:** Every hour (configurable)
**Does:**
1. Finds unprocessed resources
2. Extracts facts via Gemini
3. Generates embeddings via Voyage AI
4. Stores in items table
5. Marks resources as processed

### Summary Evolution Cron
**Runs:** Daily (configurable)
**Does:**
1. For each category with new facts
2. Fetches existing summary + new facts
3. Uses Gemini to merge (prefers newer info)
4. Updates category summary

---

## Advanced Usage

### Using with GitHub Copilot / Cursor

Same MCP configuration works with:
- **GitHub Copilot Chat** (if MCP support enabled)
- **Cursor** (if MCP support enabled)

Just point them to the same `mcp-server/dist/index.js` endpoint.

### Customizing Categories

Edit `convex/extraction.ts` prompt to change category assignments:
```typescript
const EXTRACTION_PROMPT = `
Extract facts and categorize as:
- custom_category_1
- custom_category_2
...
`;
```

### Tuning Confidence Threshold

In `convex/extraction.ts`, adjust minimum confidence:
```typescript
// Currently: only store facts with confidence >= 0.5
if (fact.confidence >= 0.5) {
  // Store fact
}

// Change to 0.7 for higher quality:
if (fact.confidence >= 0.7) {
  // Store fact
}
```

---

## Troubleshooting

### MCP Server Not Connecting

**Check:**
1. Is CONVEX_URL set correctly?
   ```bash
   echo %CONVEX_URL%  # Windows
   echo $CONVEX_URL   # Linux/Mac
   ```

2. Is Convex backend running?
   - Check Convex dashboard for deployment status

3. Is MCP server built?
   ```bash
   cd mcp-server
   npm run build
   ```

### No Search Results

**Possible Causes:**
1. No facts stored yet - use `memory_add_fact` first
2. Query too specific - try broader search
3. Embeddings not generated - check Convex logs

### Gemini API Errors

**Check:**
1. Is GEMINI_API_KEY set in Convex dashboard?
2. Do you have quota remaining?
3. Check Convex function logs for error details

### Voyage AI Errors

**Check:**
1. Is VOYAGE_API_KEY set in Convex dashboard?
2. Check API quota
3. Verify model name is `voyage-3` or `voyage-context-3`

---

## Example Session

```bash
# Start Claude Code
$ claude-code

# In conversation:
You: "Show me my memory profile"
Claude: [Uses memory_get_profile]
→ Work: 0 facts
→ Skills: 0 facts
→ Preferences: 0 facts

You: "Remember: I prefer TypeScript strict mode enabled"
Claude: [Uses memory_add_fact]
→ ✅ Stored fact in category: preferences

You: "Remember: I work at TechCorp as a Senior Full-Stack Engineer"
Claude: [Uses memory_add_fact]
→ ✅ Stored fact in category: work

You: "Search my memory for TypeScript"
Claude: [Uses memory_search]
→ Found 1 result:
  - [preferences] I prefer TypeScript strict mode enabled

You: "Get context for setting up a new TypeScript project"
Claude: [Uses memory_get_context]
→ Relevant facts:
  **Preferences:**
  - TypeScript strict mode enabled

You: "Log this session to memory"
Claude: [Uses memory_log_session]
→ ✅ Session logged (resource ID: abc123)
```

After 1 hour (cron job runs):
- Extracts additional facts from conversation
- Updates category summaries
- Memory now knows you discussed TypeScript project setup

---

## Best Practices

### 1. Be Explicit with Facts
**Good:** "Remember: I use VS Code with Vim extension"
**Bad:** "I like this editor setup"

### 2. Use Specific Categories
Facts auto-categorize, but you can guide:
**Good:** "Store as preference: I prefer Tailwind over Bootstrap"
**Bad:** "Remember Tailwind"

### 3. Log Long Sessions
After coding sessions with valuable context:
```
"Log this entire conversation to memory"
```

### 4. Review Profile Regularly
```
"Show me my memory profile"
```
Helps understand what the system knows about you.

### 5. Search Before Adding
Avoid duplicates:
```
"Search my memory for React preferences"
[Then add if not found]
"Remember: I prefer React hooks over class components"
```

---

## What's Next?

### Phase 2: Knowledge Graph (Future)
- Entity relationships (e.g., "works_at", "skilled_in")
- Graph traversal queries
- Relationship-aware context retrieval

### Phase 3: Hybrid Retrieval (Future)
- Vector search + graph traversal in parallel
- Time-decay relevance scoring
- Smarter context assembly

### Phase 4: Dashboard (Optional)
- Visual memory browser
- Category management UI
- Fact editing interface

---

## Quick Reference

### Environment Variables
```bash
CONVEX_URL=https://your-deployment.convex.cloud
GEMINI_API_KEY=your-gemini-key
VOYAGE_API_KEY=your-voyage-key
```

### MCP Tools
| Tool | Purpose | Example |
|------|---------|---------|
| memory_search | Find facts | "Search for Python tips" |
| memory_add_fact | Store fact | "Remember: I use Vim" |
| memory_get_context | Task context | "Context for: debugging" |
| memory_log_session | Save conversation | "Log this session" |
| memory_get_profile | View summary | "Show my profile" |

### File Structure
```
mem-sona/
├── convex/           # Backend (deployed to Convex)
│   ├── schema.ts     # Database schema
│   ├── resources.ts  # Session logs
│   ├── items.ts      # Facts + vector search
│   ├── categories.ts # Summaries
│   └── extraction.ts # Gemini extraction
├── mcp-server/       # MCP server (runs locally)
│   └── dist/
│       └── index.js  # Built server (point Claude Code here)
└── QUICKSTART.md     # This file
```

---

## Support

### Documentation
- PRD: `PRD_mem-sona.md`
- Project Context: `CLAUDE.md`
- Sprint Details: `.scrum/sprints/sprint-001/`

### Convex Resources
- Dashboard: https://dashboard.convex.dev
- Docs: https://docs.convex.dev

### MCP Protocol
- Spec: https://modelcontextprotocol.io

---

**You're ready to use mem-sona!** 🎉

Start by adding a few facts about yourself, then let the AI agents learn your preferences over time.
