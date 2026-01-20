#!/usr/bin/env node
/**
 * MCP Server Entry Point for mem-sona
 * Exposes memory tools to AI coding agents via Model Context Protocol
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ToolHandlers } from "./handlers.js";
import { TOOL_DEFINITIONS } from "./tools.js";

const CONVEX_URL = process.env.CONVEX_URL || "";

if (!CONVEX_URL) {
  console.error("ERROR: CONVEX_URL environment variable is required");
  console.error("Please set CONVEX_URL to your Convex deployment URL");
  process.exit(1);
}

const server = new Server(
  {
    name: "mem-sona-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const handlers = new ToolHandlers(CONVEX_URL);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error("Listing available tools...");
  return {
    tools: TOOL_DEFINITIONS,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  console.error(`Tool called: ${name}`);
  console.error(`Arguments:`, JSON.stringify(args, null, 2));

  try {
    switch (name) {
      case "memory_search":
        return await handlers.handleMemorySearch(args as any);
      
      case "memory_add_fact":
        return await handlers.handleMemoryAddFact(args as any);
      
      case "memory_get_context":
        return await handlers.handleMemoryGetContext(args as any);
      
      case "memory_log_session":
        return await handlers.handleMemoryLogSession(args as any);
      
      case "memory_get_profile":
        return await handlers.handleMemoryGetProfile();
      
      case "memory_add_entity":
        return await handlers.handleMemoryAddEntity(args as any);
      
      case "memory_add_relationship":
        return await handlers.handleMemoryAddRelationship(args as any);

      case "memory_get_project":
        return await handlers.handleMemoryGetProject(args as any);

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error: any) {
    console.error(`Error executing tool ${name}:`, error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  console.error("Starting mem-sona MCP server...");
  console.error(`Convex URL: ${CONVEX_URL}`);
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("MCP server ready and listening on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
