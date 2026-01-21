/**
 * Development Watcher
 *
 * Watches for file changes in the dist directory and notifies
 * Claude Code via MCP list_changed notifications.
 *
 * This enables a development workflow where:
 * 1. Developer makes changes to source code
 * 2. TypeScript compiles to dist/
 * 3. Watcher detects changes and notifies Claude
 * 4. Claude refreshes its tool list
 *
 * Note: Due to ES Module limitations, actual code reload requires
 * process restart. The watcher can trigger a graceful restart.
 */

import { watch, type FSWatcher } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Configuration for the development watcher.
 */
export interface WatcherConfig {
  /** Enable watching (default: false, enabled via JIRA_MCP_DEV=true) */
  enabled: boolean;
  /** Debounce delay in ms (default: 500) */
  debounceMs: number;
  /** Auto-restart on changes (default: false) */
  autoRestart: boolean;
}

/**
 * State for the watcher.
 */
interface WatcherState {
  watcher: FSWatcher | null;
  server: Server | null;
  debounceTimer: NodeJS.Timeout | null;
  pendingRestart: boolean;
  lastChangeTime: number;
}

const state: WatcherState = {
  watcher: null,
  server: null,
  debounceTimer: null,
  pendingRestart: false,
  lastChangeTime: 0,
};

/**
 * Gets the default watcher configuration from environment variables.
 */
export function getWatcherConfig(): WatcherConfig {
  return {
    enabled: process.env["JIRA_MCP_DEV"] === "true",
    debounceMs: parseInt(process.env["JIRA_MCP_DEBOUNCE_MS"] || "500", 10),
    autoRestart: process.env["JIRA_MCP_AUTO_RESTART"] === "true",
  };
}

/**
 * Handles a detected file change.
 */
async function handleChange(
  filename: string | null,
  config: WatcherConfig
): Promise<void> {
  // Skip non-JS files
  if (filename && !filename.endsWith(".js")) {
    return;
  }

  const now = Date.now();
  state.lastChangeTime = now;

  // Clear existing debounce timer
  if (state.debounceTimer) {
    clearTimeout(state.debounceTimer);
  }

  // Debounce to avoid multiple rapid notifications
  state.debounceTimer = setTimeout(async () => {
    console.error(`[dev-watcher] Change detected: ${filename || "unknown"}`);

    if (config.autoRestart) {
      // Schedule a graceful restart
      console.error("[dev-watcher] Auto-restart enabled, restarting...");
      state.pendingRestart = true;
      scheduleRestart();
    } else if (state.server) {
      // Notify Claude that tools may have changed
      try {
        await state.server.sendToolListChanged();
        console.error("[dev-watcher] Notified Claude of tool list change");
        console.error(
          "[dev-watcher] Note: Code changes require restart. Use jira_dev_reload tool or restart Claude Code."
        );
      } catch (error) {
        console.error("[dev-watcher] Failed to send notification:", error);
      }
    }
  }, config.debounceMs);
}

/**
 * Schedules a graceful process restart.
 * Uses exit code 0 so the parent process (Claude) may restart us.
 */
function scheduleRestart(): void {
  // Give time for any pending operations
  setTimeout(() => {
    console.error("[dev-watcher] Performing graceful restart...");
    process.exit(0);
  }, 100);
}

/**
 * Starts the file watcher for development mode.
 *
 * @param server - The MCP server instance for sending notifications
 * @param config - Watcher configuration (defaults from environment)
 */
export function startWatcher(
  server: Server,
  config: WatcherConfig = getWatcherConfig()
): void {
  if (!config.enabled) {
    return;
  }

  // Store server reference for notifications
  state.server = server;

  // Watch the dist directory (two levels up from dist/dev/)
  const distDir = join(__dirname, "..");

  try {
    state.watcher = watch(distDir, { recursive: true }, (_event, filename) => {
      handleChange(filename, config);
    });

    console.error(`[dev-watcher] Watching for changes in: ${distDir}`);
    console.error(
      `[dev-watcher] Auto-restart: ${config.autoRestart ? "enabled" : "disabled"}`
    );

    // Handle watcher errors
    state.watcher.on("error", (error) => {
      console.error("[dev-watcher] Watcher error:", error);
    });
  } catch (error) {
    console.error("[dev-watcher] Failed to start watcher:", error);
  }
}

/**
 * Stops the file watcher.
 */
export function stopWatcher(): void {
  if (state.debounceTimer) {
    clearTimeout(state.debounceTimer);
    state.debounceTimer = null;
  }

  if (state.watcher) {
    state.watcher.close();
    state.watcher = null;
    console.error("[dev-watcher] Watcher stopped");
  }

  state.server = null;
}

/**
 * Checks if a restart is pending.
 */
export function isRestartPending(): boolean {
  return state.pendingRestart;
}

/**
 * Gets the timestamp of the last detected change.
 */
export function getLastChangeTime(): number {
  return state.lastChangeTime;
}

/**
 * Triggers a manual restart (for use by the reload tool).
 */
export function triggerRestart(): void {
  console.error("[dev-watcher] Manual restart triggered");
  state.pendingRestart = true;
  scheduleRestart();
}
