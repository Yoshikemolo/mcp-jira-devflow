/**
 * Shared TypeScript types and interfaces.
 */

/**
 * Result type for operations that can fail.
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Creates a success result.
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Creates a failure result.
 */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Async result type.
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Generic pagination parameters.
 */
export interface PaginationParams {
  offset?: number;
  limit?: number;
}

/**
 * Generic paginated response.
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Tool execution context.
 */
export interface ToolContext {
  dryRun: boolean;
  requestId: string;
  timestamp: string;
}
