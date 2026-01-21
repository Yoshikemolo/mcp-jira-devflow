/**
 * Server State Management
 *
 * Manages the runtime state of the MCP Jira server, including
 * configuration status and client instance.
 */

import type { JiraConfig, FieldMappings } from "./config/index.js";
import { JiraClient } from "./domain/jira-client.js";
import {
  STORY_POINTS_FIELD_CANDIDATES,
  SPRINT_FIELD_CANDIDATES,
} from "./domain/mappers.js";

/**
 * Resolved field mappings with primary field and candidates for reading.
 */
export interface ResolvedFieldMappings {
  /** Primary field for writing story points */
  storyPointsField: string;
  /** All candidates for reading story points (primary field first) */
  storyPointsCandidates: string[];
  /** Primary field for writing sprint */
  sprintField: string;
  /** All candidates for reading sprint (primary field first) */
  sprintCandidates: string[];
}

/**
 * Resolves field mappings by merging user configuration with defaults.
 * User-specified fields are prioritized and placed first in candidate lists.
 *
 * @param mappings - Optional user-provided field mappings
 * @returns Resolved field mappings with primary fields and candidates
 */
export function resolveFieldMappings(mappings?: FieldMappings): ResolvedFieldMappings {
  // Convert readonly tuples to mutable string arrays
  const defaultStoryPointsCandidates: string[] = [...STORY_POINTS_FIELD_CANDIDATES];
  const defaultSprintCandidates: string[] = [...SPRINT_FIELD_CANDIDATES];

  // Get default primary fields (these arrays are guaranteed to have at least one element)
  const defaultStoryPointsField = STORY_POINTS_FIELD_CANDIDATES[0] as string;
  const defaultSprintField = SPRINT_FIELD_CANDIDATES[0] as string;

  // Story points: user field first, then defaults (without duplicates)
  let storyPointsField: string = defaultStoryPointsField;
  let storyPointsCandidates: string[] = defaultStoryPointsCandidates;

  if (mappings?.storyPoints) {
    storyPointsField = mappings.storyPoints;
    // Put user field first, then filter it out from defaults
    storyPointsCandidates = [
      mappings.storyPoints,
      ...defaultStoryPointsCandidates.filter((f) => f !== mappings.storyPoints),
    ];
  }

  // Sprint: user field first, then defaults (without duplicates)
  let sprintField: string = defaultSprintField;
  let sprintCandidates: string[] = defaultSprintCandidates;

  if (mappings?.sprint) {
    sprintField = mappings.sprint;
    // Put user field first, then filter it out from defaults
    sprintCandidates = [
      mappings.sprint,
      ...defaultSprintCandidates.filter((f) => f !== mappings.sprint),
    ];
  }

  return {
    storyPointsField,
    storyPointsCandidates,
    sprintField,
    sprintCandidates,
  };
}

/**
 * Server configuration state.
 */
export type ServerState =
  | { status: "unconfigured" }
  | {
      status: "configured";
      client: JiraClient;
      config: JiraConfig;
      fieldMappings: ResolvedFieldMappings;
    };

/**
 * Global server state singleton.
 * The server can be in one of two states:
 * - unconfigured: No valid credentials, only setup tools available
 * - configured: Valid credentials, all tools available
 */
let serverState: ServerState = { status: "unconfigured" };

/**
 * Gets the current server state.
 */
export function getServerState(): ServerState {
  return serverState;
}

/**
 * Sets the server state to configured with a client instance.
 */
export function setConfigured(
  config: JiraConfig,
  client: JiraClient,
  fieldMappings?: ResolvedFieldMappings
): void {
  const resolvedMappings = fieldMappings ?? resolveFieldMappings(config.fieldMappings);
  serverState = { status: "configured", client, config, fieldMappings: resolvedMappings };
}

/**
 * Sets the server state to unconfigured.
 */
export function setUnconfigured(): void {
  serverState = { status: "unconfigured" };
}

/**
 * Checks if the server is configured.
 */
export function isConfigured(): boolean {
  return serverState.status === "configured";
}

/**
 * Gets the Jira client if configured.
 * Returns undefined if not configured.
 */
export function getClient(): JiraClient | undefined {
  return serverState.status === "configured" ? serverState.client : undefined;
}

/**
 * Gets the current configuration if available.
 * Returns undefined if not configured.
 */
export function getConfig(): JiraConfig | undefined {
  return serverState.status === "configured" ? serverState.config : undefined;
}

/**
 * Gets the current field mappings if configured.
 * Returns undefined if not configured.
 */
export function getFieldMappings(): ResolvedFieldMappings | undefined {
  return serverState.status === "configured" ? serverState.fieldMappings : undefined;
}

/**
 * Updates field mappings at runtime.
 * Requires the server to be in configured state.
 *
 * @param mappings - New field mappings to apply
 * @returns true if updated, false if not configured
 */
export function updateFieldMappings(mappings: FieldMappings): boolean {
  if (serverState.status !== "configured") {
    return false;
  }

  const resolvedMappings = resolveFieldMappings(mappings);
  serverState = {
    ...serverState,
    fieldMappings: resolvedMappings,
  };

  // Update the client's field mappings as well
  serverState.client.updateFieldMappings(resolvedMappings);

  return true;
}

/**
 * Resets field mappings to defaults.
 * Requires the server to be in configured state.
 *
 * @returns true if reset, false if not configured
 */
export function resetFieldMappings(): boolean {
  if (serverState.status !== "configured") {
    return false;
  }

  const resolvedMappings = resolveFieldMappings(undefined);
  serverState = {
    ...serverState,
    fieldMappings: resolvedMappings,
  };

  // Update the client's field mappings as well
  serverState.client.updateFieldMappings(resolvedMappings);

  return true;
}
