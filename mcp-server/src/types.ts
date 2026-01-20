/**
 * Type definitions for MCP tool arguments
 * Provides type safety for tool handlers
 */

/**
 * Arguments for memory_search tool
 */
export interface MemorySearchArgs {
  query: string;
  maxTokens?: number;
}

/**
 * Arguments for memory_add_fact tool
 */
export interface MemoryAddFactArgs {
  content: string;
  category: string;
}

/**
 * Arguments for memory_get_context tool
 */
export interface MemoryGetContextArgs {
  task: string;
  maxTokens?: number;
}

/**
 * Arguments for memory_log_session tool
 */
export interface MemoryLogSessionArgs {
  content: string;
  metadata?: {
    agent?: string;
    context?: string;
  };
}

/**
 * Arguments for memory_add_entity tool
 */
export interface MemoryAddEntityArgs {
  name: string;
  type: string;
  description?: string;
}

/**
 * Arguments for memory_add_relationship tool
 */
export interface MemoryAddRelationshipArgs {
  fromEntity: string;
  fromType: string;
  relationship: string;
  toEntity: string;
  toType: string;
  context?: string;
}

/**
 * Arguments for memory_get_project tool
 */
export interface MemoryGetProjectArgs {
  projectName: string;
}

/**
 * Valid entity types for the knowledge graph
 */
export const VALID_ENTITY_TYPES = ["project", "tool", "skill", "concept"] as const;
export type EntityType = typeof VALID_ENTITY_TYPES[number];

/**
 * Type guard to check if a string is a valid entity type
 */
export function isValidEntityType(type: string): type is EntityType {
  return VALID_ENTITY_TYPES.includes(type as EntityType);
}
