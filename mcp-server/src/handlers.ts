/**
 * MCP Tool Handlers for mem-sona
 * Implements Convex backend integration for memory operations
 */

import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type {
  MemorySearchArgs,
  MemoryAddFactArgs,
  MemoryGetContextArgs,
  MemoryLogSessionArgs,
  MemoryAddEntityArgs,
  MemoryAddRelationshipArgs,
  MemoryGetProjectArgs,
} from "./types.js";
import { VALID_ENTITY_TYPES, isValidEntityType } from "./types.js";

// Use anyApi for dynamic function references
// This allows the MCP server to work without pre-generated types
const api = anyApi;

// Type definitions for Convex responses
interface Item {
  _id: string;
  content: string;
  category: string;
  resourceId: string;
  createdAt: number;
  accessedAt: number;
  accessCount: number;
}

export class ToolHandlers {
  private convex: ConvexHttpClient;

  constructor(convexUrl: string) {
    this.convex = new ConvexHttpClient(convexUrl);
  }

  /**
   * Search memory using hybrid vector + graph search.
   * Calls Convex retrieval:hybridSearch action which combines:
   * - Vector search on items (file-based memory layer)
   * - Graph search on nodes (relationship-based layer)
   * - Time-decay scoring (30-day half-life)
   * - Relevance filtering (score > 0.7)
   *
   * When hybridOnly is true, only returns results with source: "hybrid",
   * which are higher-quality results that appeared in both vector and text search.
   */
  async handleMemorySearch(args: MemorySearchArgs): Promise<CallToolResult> {
    try {
      const { query, maxTokens = 2000, hybridOnly = true } = args;

      // Call Convex hybridSearch action
      const result = await this.convex.action(api.retrieval.hybridSearch, {
        query,
        maxTokens,
      });

      // Filter to hybrid-only results if requested
      let filteredResults = result.results;
      if (hybridOnly) {
        filteredResults = result.results.filter(
          (r: { source: string }) => r.source === "hybrid"
        );
      }

      // If hybridOnly and no hybrid results, return empty message
      if (hybridOnly && filteredResults.length === 0) {
        return {
          content: [{
            type: "text",
            text: "No relevant memories found."
          }]
        };
      }

      // Regenerate context from filtered results if hybridOnly is enabled
      let contextText = result.context;
      if (hybridOnly && filteredResults.length > 0) {
        // Build markdown context from filtered results
        const lines = filteredResults.map((r: { content: string }) => `- ${r.content}`);
        contextText = `# Memory Search Results\n\n${lines.join("\n")}`;
      }

      // Return formatted context
      return {
        content: [{
          type: "text",
          text: contextText || "No relevant memories found."
        }]
      };
    } catch (error: any) {
      console.error("Memory search error:", error);
      return {
        content: [{
          type: "text",
          text: "Error searching memory: " + error.message
        }],
        isError: true
      };
    }
  }

  /**
   * Add an atomic fact to memory.
   * Creates a temporary resource first, then calls items:addItem action.
   */
  async handleMemoryAddFact(args: MemoryAddFactArgs): Promise<CallToolResult> {
    try {
      const { content, category } = args;

      // First, create a resource to serve as the source reference
      // This maintains data integrity (items require a resourceId)
      const resourceId = await this.convex.mutation(api.resources.addResource, {
        content: `Manual fact addition: ${content}`,
        sourceAgent: "mcp-server",
        timestamp: Date.now(),
      });

      // Now add the item with the resource reference
      // The addItem action handles embedding generation internally
      const itemId = await this.convex.action(api.items.addItem, {
        content,
        category,
        resourceId,
      });

      return {
        content: [{
          type: "text",
          text: `Fact added successfully.\nCategory: ${category}\nContent: ${content}\nItem ID: ${itemId}`
        }]
      };
    } catch (error: any) {
      console.error("Add fact error:", error);
      return {
        content: [{
          type: "text",
          text: "Error adding fact: " + error.message
        }],
        isError: true
      };
    }
  }

  /**
   * Get relevant context for a specific task.
   * Uses hybrid search (vector + graph) to find relevant information.
   * This is semantically similar to memory_search but uses 'task' parameter name.
   */
  async handleMemoryGetContext(args: MemoryGetContextArgs): Promise<CallToolResult> {
    try {
      const { task, maxTokens = 2000 } = args;

      // Call Convex hybridSearch action (using 'task' as query)
      const result = await this.convex.action(api.retrieval.hybridSearch, {
        query: task, // Use 'task' parameter as search query
        maxTokens,
      });

      // Return formatted context (already markdown-formatted by assembleContextWindow)
      return {
        content: [{
          type: "text",
          text: result.context || "No relevant context found."
        }]
      };
    } catch (error: any) {
      console.error("Get context error:", error);
      return {
        content: [{
          type: "text",
          text: "Error getting context: " + error.message
        }],
        isError: true
      };
    }
  }

  /**
   * Log a conversation or session for future processing.
   * Calls Convex resources:addResource mutation to store the raw log.
   */
  async handleMemoryLogSession(args: MemoryLogSessionArgs): Promise<CallToolResult> {
    try {
      const { content, metadata } = args;

      // Determine source agent from metadata or default
      const sourceAgent = metadata?.agent || "mcp-client";

      // Add context prefix if provided
      const fullContent = metadata?.context
        ? `[Context: ${metadata.context}]\n\n${content}`
        : content;

      // Store the session log via Convex mutation
      const resourceId = await this.convex.mutation(api.resources.addResource, {
        content: fullContent,
        sourceAgent,
        timestamp: Date.now(),
      });

      return {
        content: [{
          type: "text",
          text: `Session logged successfully.\nResource ID: ${resourceId}\nSource: ${sourceAgent}\nContent length: ${content.length} characters\n\nThe session will be processed for fact extraction in the background.`
        }]
      };
    } catch (error: any) {
      console.error("Log session error:", error);
      return {
        content: [{
          type: "text",
          text: "Error logging session: " + error.message
        }],
        isError: true
      };
    }
  }

  /**
   * Get a comprehensive user profile summary.
   * Aggregates recently accessed items and category summaries.
   */
  async handleMemoryGetProfile(): Promise<CallToolResult> {
    try {
      // Get recently accessed items (hot memories)
      const recentItems = await this.convex.query(api.items.getRecentlyAccessed, {
        limit: 20,
      });

      if (!recentItems || recentItems.length === 0) {
        return {
          content: [{
            type: "text",
            text: "No profile data found yet. The memory system is empty.\n\nStart by:\n1. Using memory_log_session to log conversations\n2. Using memory_add_fact to add specific facts about preferences, skills, or projects"
          }]
        };
      }

      // Group by category
      const byCategory: Record<string, Item[]> = {};
      for (const item of recentItems as Item[]) {
        if (!byCategory[item.category]) {
          byCategory[item.category] = [];
        }
        byCategory[item.category].push(item);
      }

      // Build profile summary
      const profileSections = Object.entries(byCategory).map(([category, items]) => {
        const topFacts = items.slice(0, 5).map(item => `  - ${item.content}`).join("\n");
        return `## ${category}\n${topFacts}`;
      }).join("\n\n");

      // Calculate stats
      const totalAccesses = recentItems.reduce((sum: number, item: Item) => sum + item.accessCount, 0);
      const categories = Object.keys(byCategory);

      return {
        content: [{
          type: "text",
          text: `# User Profile Summary\n\n${profileSections}\n\n---\n**Stats**: ${recentItems.length} recent memories | ${categories.length} categories | ${totalAccesses} total accesses`
        }]
      };
    } catch (error: any) {
      console.error("Get profile error:", error);
      return {
        content: [{
          type: "text",
          text: "Error getting profile: " + error.message
        }],
        isError: true
      };
    }
  }

  /**
   * Add a named entity to the knowledge graph.
   * Creates a node with embedding generation via Convex graph.createNode action.
   */
  async handleMemoryAddEntity(args: MemoryAddEntityArgs): Promise<CallToolResult> {
    try {
      const { name, type, description } = args;

      // Validate type using shared utility
      if (!isValidEntityType(type)) {
        return {
          content: [{
            type: "text",
            text: `Invalid entity type: ${type}. Must be one of: ${VALID_ENTITY_TYPES.join(", ")}`
          }],
          isError: true
        };
      }

      // Build properties object (simplified - no redundant construction)
      const properties = description ? { description } : {};

      // Call Convex graph.createNode action (returns metadata with wasCreated flag)
      const result = await this.convex.action(api.graph.createNode, {
        name,
        type,
        properties,
      });

      // Adjust message based on whether node was newly created or already existed
      const statusMessage = result.wasCreated
        ? "Entity created successfully"
        : "Entity already exists (existing node returned)";

      return {
        content: [{
          type: "text",
          text: `${statusMessage}.\nName: ${name}\nType: ${type}${description ? `\nDescription: ${description}` : ""}\nNode ID: ${result.nodeId}`
        }]
      };
    } catch (error: any) {
      console.error("Add entity error:", error);
      return {
        content: [{
          type: "text",
          text: "Error adding entity: " + error.message
        }],
        isError: true
      };
    }
  }

  /**
   * Create a relationship between two entities.
   * Calls Convex graph.upsertEdge action which handles:
   * - Node creation if entities don't exist
   * - Exclusive relationship handling (archiving old edges)
   * - Edge strengthening for repeated relationships
   */
  async handleMemoryAddRelationship(args: MemoryAddRelationshipArgs): Promise<CallToolResult> {
    try {
      const { fromEntity, fromType, relationship, toEntity, toType, context } = args;

      // Validate types using shared utility
      if (!isValidEntityType(fromType)) {
        return {
          content: [{
            type: "text",
            text: `Invalid fromType: ${fromType}. Must be one of: ${VALID_ENTITY_TYPES.join(", ")}`
          }],
          isError: true
        };
      }
      if (!isValidEntityType(toType)) {
        return {
          content: [{
            type: "text",
            text: `Invalid toType: ${toType}. Must be one of: ${VALID_ENTITY_TYPES.join(", ")}`
          }],
          isError: true
        };
      }

      // Call Convex graph.upsertEdge action
      const result = await this.convex.action(api.graph.upsertEdge, {
        fromName: fromEntity,
        fromType: fromType,
        toName: toEntity,
        toType: toType,
        relationship: relationship,
        context: context,
      });

      // Format response based on action taken
      let message = "";
      if (result.action === "created") {
        message = `Relationship created successfully.\nFrom: ${fromEntity} (${fromType})\nRelationship: ${relationship}\nTo: ${toEntity} (${toType})`;
      } else if (result.action === "strengthened") {
        message = `Relationship strengthened (already exists).\nFrom: ${fromEntity} (${fromType})\nRelationship: ${relationship}\nTo: ${toEntity} (${toType})\nNote: Weight increased by 0.1 (max 1.0)`;
      } else if (result.action === "superseded_and_created") {
        message = `Exclusive relationship updated.\nFrom: ${fromEntity} (${fromType})\nRelationship: ${relationship}\nTo: ${toEntity} (${toType})\nNote: Previous ${relationship} edges archived`;
      }

      if (context) {
        message += `\nContext: ${context}`;
      }
      message += `\nEdge ID: ${result.edgeId}`;

      return {
        content: [{
          type: "text",
          text: message
        }]
      };
    } catch (error: any) {
      console.error("Add relationship error:", error);
      return {
        content: [{
          type: "text",
          text: "Error adding relationship: " + error.message
        }],
        isError: true
      };
    }
  }

  /**
   * Get a project with its tools and required skills (2-hop query).
   * Performs graph traversal: project -> uses_tool -> tools -> requires_skill -> skills
   */
  async handleMemoryGetProject(args: MemoryGetProjectArgs): Promise<CallToolResult> {
    try {
      const { projectName } = args;

      // Call Convex graph.getProjectWithToolsAndSkills action
      const result = await this.convex.action(api.graph.getProjectWithToolsAndSkills, {
        projectName: projectName,
      });

      if (!result) {
        return {
          content: [{
            type: "text",
            text: `Project not found: "${projectName}"\n\nMake sure the project exists in the knowledge graph. Use memory_add_entity to create it first.`
          }]
        };
      }

      // Format the response
      let output = `# Project: ${result.project.name}\n\n`;

      if (result.project.properties?.description) {
        output += `**Description**: ${result.project.properties.description}\n\n`;
      }

      // Tools section
      if (result.tools.length > 0) {
        output += `## Tools Used (${result.tools.length})\n\n`;
        for (const tool of result.tools) {
          output += `- **${tool.name}**`;
          if (tool.properties?.description) {
            output += `: ${tool.properties.description}`;
          }
          output += "\n";
        }
        output += "\n";
      } else {
        output += `## Tools Used\n\nNo tools linked to this project yet.\n\n`;
      }

      // Skills section
      if (result.skills.length > 0) {
        output += `## Required Skills (${result.skills.length})\n\n`;
        for (const skill of result.skills) {
          output += `- **${skill.name}**`;
          if (skill.properties?.description) {
            output += `: ${skill.properties.description}`;
          }
          output += "\n";
        }
        output += "\n";
      } else {
        output += `## Required Skills\n\nNo skills linked yet (no tool prerequisites defined).\n\n`;
      }

      // Metadata
      output += `---\n`;
      output += `_Project ID: ${result.project._id}_\n`;
      output += `_Created: ${new Date(result.project.createdAt).toLocaleDateString()}_`;

      return {
        content: [{
          type: "text",
          text: output
        }]
      };
    } catch (error: any) {
      console.error("Get project error:", error);
      return {
        content: [{
          type: "text",
          text: "Error getting project: " + error.message
        }],
        isError: true
      };
    }
  }
}
