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

/**
 * Validation helper for MCP tool arguments
 * Provides runtime validation instead of unsafe type assertions
 *
 * @param args - Arguments object from MCP request
 * @param typeName - Type name for error messages
 * @param validator - Validation function that checks required fields
 * @returns Validated arguments with proper typing
 * @throws Error if validation fails
 *
 * @example
 * const validated = validateArgs<MemorySearchArgs>(
 *   args,
 *   "MemorySearchArgs",
 *   (a) => typeof a.query === "string"
 * );
 */
export function validateArgs<T>(
  args: unknown,
  typeName: string,
  validator: (args: any) => boolean
): T {
  // Check if args is an object
  if (!args || typeof args !== "object") {
    throw new Error(`Invalid arguments for ${typeName}: expected object, got ${typeof args}`);
  }

  // Run custom validation
  if (!validator(args)) {
    throw new Error(`Validation failed for ${typeName}: missing or invalid required fields`);
  }

  return args as T;
}

/**
 * Validators for each tool argument type
 * These functions check required fields and types at runtime
 */
export const validators = {
  memorySearch: (args: any): args is MemorySearchArgs => {
    return typeof args.query === "string" &&
           (args.maxTokens === undefined || typeof args.maxTokens === "number");
  },

  memoryAddFact: (args: any): args is MemoryAddFactArgs => {
    return typeof args.content === "string" &&
           typeof args.category === "string";
  },

  memoryGetContext: (args: any): args is MemoryGetContextArgs => {
    return typeof args.task === "string" &&
           (args.maxTokens === undefined || typeof args.maxTokens === "number");
  },

  memoryLogSession: (args: any): args is MemoryLogSessionArgs => {
    if (typeof args.content !== "string") return false;

    if (args.metadata !== undefined) {
      if (typeof args.metadata !== "object" || args.metadata === null) return false;

      const metadata = args.metadata as any;
      if (metadata.agent !== undefined && typeof metadata.agent !== "string") return false;
      if (metadata.context !== undefined && typeof metadata.context !== "string") return false;
    }

    return true;
  },

  memoryAddEntity: (args: any): args is MemoryAddEntityArgs => {
    return typeof args.name === "string" &&
           typeof args.type === "string" &&
           (args.description === undefined || typeof args.description === "string");
  },

  memoryAddRelationship: (args: any): args is MemoryAddRelationshipArgs => {
    return typeof args.fromEntity === "string" &&
           typeof args.fromType === "string" &&
           typeof args.relationship === "string" &&
           typeof args.toEntity === "string" &&
           typeof args.toType === "string" &&
           (args.context === undefined || typeof args.context === "string");
  },

  memoryGetProject: (args: any): args is MemoryGetProjectArgs => {
    return typeof args.projectName === "string";
  },
};
