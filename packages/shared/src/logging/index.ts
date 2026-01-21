/**
 * Structured logging with redaction support.
 *
 * Placeholder - implementation to follow.
 */

export interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

/**
 * Creates a logger instance.
 * Placeholder implementation.
 */
export function createLogger(_name: string): Logger {
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}
