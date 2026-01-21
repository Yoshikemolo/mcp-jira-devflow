/**
 * Server State Management
 *
 * Manages the runtime state of the MCP Jira server, including
 * configuration status and client instance.
 */

import type { JiraConfig } from "./config/index.js";
import { JiraClient } from "./domain/jira-client.js";

/**
 * Server configuration state.
 */
export type ServerState =
  | { status: "unconfigured" }
  | { status: "configured"; client: JiraClient; config: JiraConfig };

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
export function setConfigured(config: JiraConfig, client: JiraClient): void {
  serverState = { status: "configured", client, config };
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
