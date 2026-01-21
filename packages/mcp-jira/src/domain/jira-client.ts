/**
 * Jira API Client
 *
 * Centralized client for all Jira REST API interactions.
 * Handles authentication, retries, and error handling.
 *
 * Compatible with: Jira Cloud REST API v3 (2024+)
 * Note: Uses the new /search/jql endpoint which requires bounded JQL queries.
 */

import type { JiraConfig } from "../config/index.js";
import type {
  JiraIssue,
  JiraSearchOptions,
  JiraSearchResult,
  JiraPaginationOptions,
  JiraCommentsResult,
} from "./types.js";
import {
  mapIssue,
  mapSearchResult,
  mapCommentsResult,
  STORY_POINTS_FIELD_CANDIDATES,
  SPRINT_FIELD_CANDIDATES,
} from "./mappers.js";

/**
 * Minimum supported Jira API version.
 */
const MIN_API_VERSION = "3";
const SUPPORTED_DEPLOYMENT = "Cloud";

/**
 * Error thrown when Jira API returns an error.
 */
export class JiraApiError extends Error {
  readonly statusCode: number;
  readonly requestId: string | undefined;

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
/**
 * Server info returned by Jira API.
 */
export interface JiraServerInfo {
  baseUrl: string;
  version: string;
  deploymentType: string;
  buildNumber: number;
  serverTitle: string;
}

/**
 * Connection verification result.
 */
export interface ConnectionVerification {
  success: boolean;
  serverInfo?: JiraServerInfo;
  user?: { displayName: string; emailAddress: string };
  error?: string;
  compatible: boolean;
}

/**
 * Default fields to request for issue searches.
 * Includes standard fields and custom fields for story points and sprints.
 */
const DEFAULT_SEARCH_FIELDS = [
  "summary",
  "description",
  "status",
  "priority",
  "issuetype",
  "project",
  "assignee",
  "reporter",
  "created",
  "updated",
  "labels",
  "components",
  // Include custom fields for story points and sprints
  ...STORY_POINTS_FIELD_CANDIDATES,
  ...SPRINT_FIELD_CANDIDATES,
];

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
   * Verifies the connection and checks API compatibility.
   * Should be called before using other methods to ensure proper setup.
   *
   * @returns Connection verification result with server info
   */
  async verifyConnection(): Promise<ConnectionVerification> {
    try {
      // Get server info
      const serverInfo = await this.request<{
        baseUrl: string;
        version: string;
        deploymentType: string;
        buildNumber: number;
        serverTitle: string;
      }>("GET", "/serverInfo");

      // Get current user to verify auth
      const user = await this.request<{
        displayName: string;
        emailAddress: string;
      }>("GET", "/myself");

      // Check compatibility - Cloud deployment always uses latest API v3
      const isCloud = serverInfo.deploymentType === SUPPORTED_DEPLOYMENT;
      const compatible = isCloud;

      if (!compatible) {
        return {
          success: true,
          serverInfo,
          user,
          compatible: false,
          error: `Incompatible Jira deployment: ${serverInfo.deploymentType}. This client requires Jira ${SUPPORTED_DEPLOYMENT} with API v${MIN_API_VERSION}+.`,
        };
      }

      this.logger.info("Jira connection verified", {
        server: serverInfo.serverTitle,
        version: serverInfo.version,
        deployment: serverInfo.deploymentType,
        user: user.displayName,
      });

      return {
        success: true,
        serverInfo,
        user,
        compatible: true,
      };
    } catch (error) {
      return {
        success: false,
        compatible: false,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
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

        const fetchOptions: RequestInit = {
          method,
          headers: {
            Authorization: this.authHeader,
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-Request-Id": requestId,
          },
          signal: controller.signal,
        };

        if (options?.body) {
          fetchOptions.body = JSON.stringify(options.body);
        }

        const response = await fetch(url.toString(), fetchOptions);

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
          // Read error body for debugging but don't expose in message
          await response.text().catch(() => {});
          throw new JiraApiError(
            `Request failed with status ${response.status}`,
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

    // Build request body for new /search/jql endpoint (Jira Cloud 2024+ migration)
    // Note: The new endpoint requires bounded JQL queries (must include project, assignee, etc.)
    const body: Record<string, unknown> = {
      jql,
      maxResults,
      fields: options?.fields ?? DEFAULT_SEARCH_FIELDS,
    };

    // Use nextPageToken for pagination (new API), fall back to startAt (legacy)
    if (options?.nextPageToken) {
      body["nextPageToken"] = options.nextPageToken;
    } else if (options?.startAt) {
      body["startAt"] = options.startAt;
    }

    const raw = await this.request<unknown>("POST", "/search/jql", { body });

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
