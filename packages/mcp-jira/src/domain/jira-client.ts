/**
 * Jira API Client
 *
 * Centralized client for all Jira REST API interactions.
 * Handles authentication, retries, and error handling.
 */

import type { JiraConfig } from "../config/index.js";
import type {
  JiraIssue,
  JiraSearchOptions,
  JiraSearchResult,
  JiraPaginationOptions,
  JiraCommentsResult,
} from "./types.js";
import { mapIssue, mapSearchResult, mapCommentsResult } from "./mappers.js";

/**
 * Error thrown when Jira API returns an error.
 */
export class JiraApiError extends Error {
  readonly statusCode: number;
  readonly requestId?: string;

  constructor(message: string, statusCode: number, requestId?: string) {
    super(message);
    this.name = "JiraApiError";
    this.statusCode = statusCode;
    this.requestId = requestId;
  }
}

/**
 * Error thrown when an issue is not found.
 */
export class JiraNotFoundError extends JiraApiError {
  readonly issueKey: string;

  constructor(issueKey: string) {
    super(`Issue '${issueKey}' not found`, 404);
    this.name = "JiraNotFoundError";
    this.issueKey = issueKey;
  }
}

/**
 * Error thrown for authentication failures.
 */
export class JiraAuthError extends JiraApiError {
  constructor() {
    super("Authentication failed", 401);
    this.name = "JiraAuthError";
  }
}

/**
 * Logger interface for the client.
 */
interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

/**
 * Default no-op logger.
 */
const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Jira API client for read operations.
 */
export class JiraClient {
  private readonly config: JiraConfig;
  private readonly logger: Logger;
  private readonly authHeader: string;

  constructor(config: JiraConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger ?? noopLogger;

    // Pre-compute auth header (Basic Auth with email:apiToken)
    const credentials = `${config.auth.email}:${config.auth.apiToken}`;
    this.authHeader = `Basic ${Buffer.from(credentials).toString("base64")}`;
  }

  /**
   * Makes an authenticated request to the Jira API.
   */
  private async request<T>(
    method: string,
    path: string,
    options?: {
      params?: Record<string, string | number | undefined>;
      body?: unknown;
    }
  ): Promise<T> {
    const url = new URL(`${this.config.baseUrl}/rest/api/3${path}`);

    // Add query parameters
    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const requestId = crypto.randomUUID();

    this.logger.debug("Jira API request", {
      requestId,
      method,
      path,
      // Don't log full URL to avoid leaking params that might contain sensitive data
    });

    const startTime = Date.now();
    let lastError: Error | null = null;

    // Retry loop
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      if (attempt > 0) {
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        this.logger.debug("Retrying request", { requestId, attempt, delay });
        await this.sleep(delay);
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout
        );

        const response = await fetch(url.toString(), {
          method,
          headers: {
            Authorization: this.authHeader,
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Request-Id": requestId,
          },
          body: options?.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;

        this.logger.debug("Jira API response", {
          requestId,
          status: response.status,
          duration,
        });

        // Handle error responses
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new JiraAuthError();
          }

          if (response.status === 404) {
            // Will be handled by caller with more context
            throw new JiraApiError("Not found", 404, requestId);
          }

          if (response.status === 429) {
            // Rate limited - retry
            this.logger.warn("Rate limited by Jira API", { requestId });
            lastError = new JiraApiError("Rate limited", 429, requestId);
            continue;
          }

          if (response.status >= 500) {
            // Server error - retry
            this.logger.warn("Jira API server error", {
              requestId,
              status: response.status,
            });
            lastError = new JiraApiError(
              "Server error",
              response.status,
              requestId
            );
            continue;
          }

          // Client error - don't retry
          const errorBody = await response.text().catch(() => "Unknown error");
          throw new JiraApiError(
            `Request failed: ${response.status}`,
            response.status,
            requestId
          );
        }

        // Parse response
        const data = (await response.json()) as T;
        return data;
      } catch (error) {
        if (error instanceof JiraApiError) {
          throw error;
        }

        if (error instanceof Error && error.name === "AbortError") {
          this.logger.warn("Request timeout", { requestId, attempt });
          lastError = new JiraApiError("Request timeout", 408, requestId);
          continue;
        }

        // Network error - retry
        this.logger.warn("Network error", {
          requestId,
          error: error instanceof Error ? error.message : "Unknown",
        });
        lastError = new JiraApiError(
          "Network error",
          0,
          requestId
        );
      }
    }

    // All retries exhausted
    throw lastError ?? new JiraApiError("Request failed", 0);
  }

  /**
   * Sleep for the specified duration.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Gets a single issue by key.
   *
   * @param issueKey - The issue key (e.g., "PROJECT-123")
   * @returns The issue details
   * @throws JiraNotFoundError if the issue doesn't exist
   */
  async getIssue(issueKey: string): Promise<JiraIssue> {
    // Validate issue key format
    if (!/^[A-Z][A-Z0-9]*-\d+$/i.test(issueKey)) {
      throw new Error(`Invalid issue key format: ${issueKey}`);
    }

    try {
      const raw = await this.request<unknown>(
        "GET",
        `/issue/${issueKey}`,
        {
          params: {
            fields:
              "summary,description,status,priority,issuetype,project,assignee,reporter,created,updated,labels,components",
          },
        }
      );

      return mapIssue(raw as Parameters<typeof mapIssue>[0]);
    } catch (error) {
      if (error instanceof JiraApiError && error.statusCode === 404) {
        throw new JiraNotFoundError(issueKey);
      }
      throw error;
    }
  }

  /**
   * Searches for issues using JQL.
   *
   * @param jql - The JQL query string
   * @param options - Search options (pagination, fields)
   * @returns Search results with pagination info
   */
  async searchJql(
    jql: string,
    options?: JiraSearchOptions
  ): Promise<JiraSearchResult> {
    const maxResults = Math.min(options?.maxResults ?? 50, 50); // Cap at 50 per skill constraints

    const raw = await this.request<unknown>("GET", "/search", {
      params: {
        jql,
        startAt: options?.startAt ?? 0,
        maxResults,
        fields:
          options?.fields?.join(",") ??
          "summary,description,status,priority,issuetype,project,assignee,reporter,created,updated,labels,components",
      },
    });

    return mapSearchResult(raw as Parameters<typeof mapSearchResult>[0]);
  }

  /**
   * Gets comments for an issue.
   *
   * @param issueKey - The issue key
   * @param options - Pagination options
   * @returns Comments with pagination info
   */
  async getComments(
    issueKey: string,
    options?: JiraPaginationOptions
  ): Promise<JiraCommentsResult> {
    // Validate issue key format
    if (!/^[A-Z][A-Z0-9]*-\d+$/i.test(issueKey)) {
      throw new Error(`Invalid issue key format: ${issueKey}`);
    }

    try {
      const raw = await this.request<unknown>(
        "GET",
        `/issue/${issueKey}/comment`,
        {
          params: {
            startAt: options?.startAt ?? 0,
            maxResults: options?.maxResults ?? 50,
          },
        }
      );

      return mapCommentsResult(raw as Parameters<typeof mapCommentsResult>[0]);
    } catch (error) {
      if (error instanceof JiraApiError && error.statusCode === 404) {
        throw new JiraNotFoundError(issueKey);
      }
      throw error;
    }
  }
}
