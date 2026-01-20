/**
 * MCP Tool Definitions for mem-sona
 * Defines the schema and metadata for all exposed memory tools
 */

export const TOOL_DEFINITIONS = [
  {
    name: "memory_search",
    description: "Search memory for relevant information using hybrid vector + graph search. Returns formatted context with time-decay scoring (30-day half-life).",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Natural language search query"
        },
        maxTokens: {
          type: "number",
          description: "Maximum tokens in response (optional, default: 2000)",
          default: 2000
        }
      },
      required: ["query"]
    }
  },
  {
    name: "memory_add_fact",
    description: "Add an atomic fact to memory. Facts are categorized and vectorized for retrieval.",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The fact content (atomic, self-contained)"
        },
        category: {
          type: "string",
          description: "Category for organization (e.g., 'preferences', 'skills', 'projects')"
        }
      },
      required: ["content", "category"]
    }
  },
  {
    name: "memory_get_context",
    description: "Get relevant context summaries for a specific task. Returns category summaries and related facts.",
    inputSchema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "Description of the task or question"
        },
        maxTokens: {
          type: "number",
          description: "Maximum tokens in response (optional, default: 2000)",
          default: 2000
        }
      },
      required: ["task"]
    }
  },
  {
    name: "memory_log_session",
    description: "Log a conversation or session for future processing and fact extraction.",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The conversation or session content to log"
        },
        metadata: {
          type: "object",
          description: "Optional metadata (agent, timestamp, context)",
          properties: {
            agent: { type: "string" },
            context: { type: "string" }
          }
        }
      },
      required: ["content"]
    }
  },
  {
    name: "memory_get_profile",
    description: "Get a comprehensive user profile summary with key facts, preferences, and skills.",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "memory_add_entity",
    description: "Add or update an entity (project, tool, skill, concept) in the knowledge graph",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Entity name"
        },
        type: {
          type: "string",
          description: "Entity type (must be one of: project, tool, skill, concept)",
          enum: ["project", "tool", "skill", "concept"]
        },
        description: {
          type: "string",
          description: "Optional description of the entity"
        }
      },
      required: ["name", "type"]
    }
  },
  {
    name: "memory_add_relationship",
    description: "Create a relationship between two entities in the knowledge graph. Handles exclusive relationships (works_at, primary_language) by archiving previous edges.",
    inputSchema: {
      type: "object",
      properties: {
        fromEntity: {
          type: "string",
          description: "Source entity name"
        },
        fromType: {
          type: "string",
          description: "Source entity type (project, tool, skill, concept)",
          enum: ["project", "tool", "skill", "concept"]
        },
        relationship: {
          type: "string",
          description: "Relationship type (uses_tool, requires_skill, related_to, works_at, primary_language, etc.)"
        },
        toEntity: {
          type: "string",
          description: "Target entity name"
        },
        toType: {
          type: "string",
          description: "Target entity type (project, tool, skill, concept)",
          enum: ["project", "tool", "skill", "concept"]
        },
        context: {
          type: "string",
          description: "Optional context about the relationship"
        }
      },
      required: ["fromEntity", "fromType", "relationship", "toEntity", "toType"]
    }
  },
  {
    name: "memory_get_project",
    description: "Get a project with its tools and required skills (2-hop graph query). Returns project details, all tools used, and skills needed for those tools.",
    inputSchema: {
      type: "object",
      properties: {
        projectName: {
          type: "string",
          description: "Project name to query"
        }
      },
      required: ["projectName"]
    }
  }
] as const;
