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
import type { ResolvedFieldMappings } from "../server-state.js";
import type {
  JiraIssue,
  JiraIssueExtended,
  JiraSearchOptions,
  JiraSearchResult,
  JiraPaginationOptions,
  JiraCommentsResult,
  CreateIssueInput,
  UpdateIssueInput,
  TransitionIssueInput,
  CreateIssueResult,
  UpdateIssueResult,
  TransitionIssueResult,
  JiraTransitionsResult,
  JiraBoardsResult,
  JiraBoard,
  JiraSprintsResult,
  JiraSprintExtended,
  MoveIssuesToSprintInput,
  MoveIssuesToSprintResult,
  UpdateSprintInput,
  UpdateSprintResult,
  JiraField,
} from "./types.js";
import {
  mapIssue,
  mapIssueExtended,
  mapSearchResult,
  mapCommentsResult,
  mapTransitionsResult,
  mapBoardsResult,
  mapBoard,
  mapSprintsResult,
  mapSprintExtended,
  textToAdf,
  STORY_POINTS_FIELD_CANDIDATES,
  SPRINT_FIELD_CANDIDATES,
} from "./mappers.js";

/**
 * Minimum supported Jira API version.
 */
const MIN_API_VERSION = "3";
const SUPPORTED_DEPLOYMENT = "Cloud";

/**
 * Jira API types.
 */
type JiraApiType = "rest" | "agile";

/**
 * API base paths for different Jira APIs.
 */
const API_BASES: Record<JiraApiType, string> = {
  rest: "/rest/api/3",
  agile: "/rest/agile/1.0",
};

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
 * Error thrown when a board is not found.
 */
export class JiraBoardNotFoundError extends JiraApiError {
  readonly boardId: number;

  constructor(boardId: number) {
    super(`Board with ID '${boardId}' not found`, 404);
    this.name = "JiraBoardNotFoundError";
    this.boardId = boardId;
  }
}

/**
 * Error thrown when a sprint is not found.
 */
export class JiraSprintNotFoundError extends JiraApiError {
  readonly sprintId: number;

  constructor(sprintId: number) {
    super(`Sprint with ID '${sprintId}' not found`, 404);
    this.name = "JiraSprintNotFoundError";
    this.sprintId = sprintId;
  }
}

/**
 * Error thrown for invalid sprint state transitions.
 */
export class JiraSprintStateError extends JiraApiError {
  readonly sprintId: number;
  readonly currentState: string;
  readonly targetState: string;

  constructor(sprintId: number, currentState: string, targetState: string) {
    super(
      `Cannot transition sprint ${sprintId} from '${currentState}' to '${targetState}'`,
      400
    );
    this.name = "JiraSprintStateError";
    this.sprintId = sprintId;
    this.currentState = currentState;
    this.targetState = targetState;
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
 * Base fields to request for issue searches (without custom fields).
 */
const BASE_SEARCH_FIELDS = [
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
];

// Default search fields and extended issue fields are now computed dynamically
// via getSearchFields() and getExtendedFields() methods in JiraClient

export class JiraClient {
  private readonly config: JiraConfig;
  private readonly logger: Logger;
  private readonly authHeader: string;
  private fieldMappings: ResolvedFieldMappings;

  constructor(config: JiraConfig, logger?: Logger, fieldMappings?: ResolvedFieldMappings) {
    this.config = config;
    this.logger = logger ?? noopLogger;

    // Pre-compute auth header (Basic Auth with email:apiToken)
    const credentials = `${config.auth.email}:${config.auth.apiToken}`;
    this.authHeader = `Basic ${Buffer.from(credentials).toString("base64")}`;

    // Initialize field mappings (defaults if not provided)
    this.fieldMappings = fieldMappings ?? {
      storyPointsField: STORY_POINTS_FIELD_CANDIDATES[0],
      storyPointsCandidates: [...STORY_POINTS_FIELD_CANDIDATES],
      sprintField: SPRINT_FIELD_CANDIDATES[0],
      sprintCandidates: [...SPRINT_FIELD_CANDIDATES],
    };
  }

  /**
   * Updates field mappings at runtime.
   * Used when field mappings are configured via the jira_configure_fields tool.
   */
  updateFieldMappings(mappings: ResolvedFieldMappings): void {
    this.fieldMappings = mappings;
  }

  /**
   * Gets the current field mappings.
   */
  getFieldMappings(): ResolvedFieldMappings {
    return this.fieldMappings;
  }

  /**
   * Gets the search fields including configured custom field candidates.
   */
  private getSearchFields(): string[] {
    return [
      ...BASE_SEARCH_FIELDS,
      ...this.fieldMappings.storyPointsCandidates,
      ...this.fieldMappings.sprintCandidates,
    ];
  }

  /**
   * Gets the extended fields for deep analysis including hierarchy and links.
   */
  private getExtendedFields(): string[] {
    return [
      ...this.getSearchFields(),
      "parent",
      "subtasks",
      "issuelinks",
    ];
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
   *
   * @param method - HTTP method
   * @param path - API path (without base)
   * @param options - Request options including params, body, and API type
   */
  private async request<T>(
    method: string,
    path: string,
    options?: {
      params?: Record<string, string | number | undefined>;
      body?: unknown;
      api?: JiraApiType;
    }
  ): Promise<T> {
    const apiBase = API_BASES[options?.api ?? "rest"];
    const url = new URL(`${this.config.baseUrl}${apiBase}${path}`);

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
      fields: options?.fields ?? this.getSearchFields(),
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

  /**
   * Gets a single issue with extended data including parent, subtasks, and links.
   * Used for deep analysis to understand issue hierarchy.
   *
   * @param issueKey - The issue key (e.g., "PROJECT-123")
   * @returns The extended issue details with hierarchy information
   * @throws JiraNotFoundError if the issue doesn't exist
   */
  async getIssueExtended(issueKey: string): Promise<JiraIssueExtended> {
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
            fields: this.getExtendedFields().join(","),
          },
        }
      );

      return mapIssueExtended(raw as Parameters<typeof mapIssueExtended>[0]);
    } catch (error) {
      if (error instanceof JiraApiError && error.statusCode === 404) {
        throw new JiraNotFoundError(issueKey);
      }
      throw error;
    }
  }

  /**
   * Gets all subtasks of a parent issue using JQL search.
   * This method uses searchJql internally, which includes story points and sprint fields.
   * Used for deep analysis to fetch subtasks with full estimation data.
   *
   * @param parentKey - The parent issue key
   * @param maxResults - Maximum number of subtasks to fetch (default: 100)
   * @returns Array of subtask issues with story points
   */
  async getSubtasks(parentKey: string, maxResults = 100): Promise<JiraIssue[]> {
    // Validate parent key format
    if (!/^[A-Z][A-Z0-9]*-\d+$/i.test(parentKey)) {
      throw new Error(`Invalid parent key format: ${parentKey}`);
    }

    // Use JQL to find all subtasks of this parent
    const jql = `parent = ${parentKey} ORDER BY created ASC`;

    const allIssues: JiraIssue[] = [];
    let nextPageToken: string | undefined;

    // Paginate through all results
    while (allIssues.length < maxResults) {
      const batchSize = Math.min(50, maxResults - allIssues.length);
      const result = await this.searchJql(jql, {
        maxResults: batchSize,
        nextPageToken,
        fields: this.getSearchFields(),
      });

      allIssues.push(...result.issues);

      if (result.isLast || !result.nextPageToken) {
        break;
      }

      nextPageToken = result.nextPageToken;
    }

    return allIssues;
  }

  /**
   * Gets all issues that are children of an epic.
   * Used for deep analysis to fetch epic's child issues.
   *
   * @param epicKey - The epic issue key
   * @param maxResults - Maximum number of children to fetch (default: 100)
   * @returns Array of child issues
   */
  async getEpicChildren(epicKey: string, maxResults = 100): Promise<JiraIssue[]> {
    // Validate epic key format
    if (!/^[A-Z][A-Z0-9]*-\d+$/i.test(epicKey)) {
      throw new Error(`Invalid epic key format: ${epicKey}`);
    }

    // Use JQL to find all issues with this epic as parent
    // This works for both classic epics ("Epic Link") and next-gen epics (parent field)
    const jql = `"Epic Link" = ${epicKey} OR parent = ${epicKey} ORDER BY created ASC`;

    const allIssues: JiraIssue[] = [];
    let nextPageToken: string | undefined;

    // Paginate through all results
    while (allIssues.length < maxResults) {
      const batchSize = Math.min(50, maxResults - allIssues.length);
      const result = await this.searchJql(jql, {
        maxResults: batchSize,
        nextPageToken,
        fields: this.getSearchFields(),
      });

      allIssues.push(...result.issues);

      if (result.isLast || !result.nextPageToken) {
        break;
      }

      nextPageToken = result.nextPageToken;
    }

    return allIssues;
  }

  // ============================================================================
  // Write Operations
  // ============================================================================

  /**
   * Creates a new Jira issue.
   *
   * @param input - The issue creation input
   * @returns The created issue key and ID
   */
  async createIssue(input: CreateIssueInput): Promise<CreateIssueResult> {
    // Build the fields object for the API
    const fields: Record<string, unknown> = {
      project: { key: input.projectKey },
      summary: input.summary,
      issuetype: { name: input.issueTypeName },
    };

    // Add optional fields
    if (input.description) {
      fields["description"] = textToAdf(input.description);
    }

    if (input.assigneeAccountId) {
      fields["assignee"] = { accountId: input.assigneeAccountId };
    }

    if (input.priorityName) {
      fields["priority"] = { name: input.priorityName };
    }

    if (input.labels && input.labels.length > 0) {
      fields["labels"] = [...input.labels];
    }

    if (input.parentKey) {
      fields["parent"] = { key: input.parentKey };
    }

    // Story points - use configured field
    if (input.storyPoints !== undefined) {
      fields[this.fieldMappings.storyPointsField] = input.storyPoints;
    }

    const response = await this.request<{
      id: string;
      key: string;
      self: string;
    }>("POST", "/issue", {
      body: { fields },
    });

    return {
      id: response.id,
      key: response.key,
      self: response.self,
    };
  }

  /**
   * Updates an existing Jira issue.
   *
   * @param input - The issue update input (partial update)
   * @returns Success indicator
   */
  async updateIssue(input: UpdateIssueInput): Promise<UpdateIssueResult> {
    // Validate issue key format
    if (!/^[A-Z][A-Z0-9]*-\d+$/i.test(input.issueKey)) {
      throw new Error(`Invalid issue key format: ${input.issueKey}`);
    }

    // Build the fields object for partial update
    const fields: Record<string, unknown> = {};

    if (input.summary !== undefined) {
      fields["summary"] = input.summary;
    }

    if (input.description !== undefined) {
      fields["description"] = textToAdf(input.description);
    }

    if (input.assigneeAccountId !== undefined) {
      fields["assignee"] = input.assigneeAccountId
        ? { accountId: input.assigneeAccountId }
        : null; // null to unassign
    }

    if (input.priorityName !== undefined) {
      fields["priority"] = { name: input.priorityName };
    }

    if (input.labels !== undefined) {
      fields["labels"] = [...input.labels];
    }

    // Story points - use configured field
    if (input.storyPoints !== undefined) {
      fields[this.fieldMappings.storyPointsField] = input.storyPoints;
    }

    // Only make the request if there are fields to update
    if (Object.keys(fields).length === 0) {
      return { success: true, issueKey: input.issueKey };
    }

    try {
      await this.request<void>("PUT", `/issue/${input.issueKey}`, {
        body: { fields },
      });

      return { success: true, issueKey: input.issueKey };
    } catch (error) {
      if (error instanceof JiraApiError && error.statusCode === 404) {
        throw new JiraNotFoundError(input.issueKey);
      }
      throw error;
    }
  }

  /**
   * Gets available transitions for an issue.
   *
   * @param issueKey - The issue key
   * @returns Available transitions
   */
  async getTransitions(issueKey: string): Promise<JiraTransitionsResult> {
    // Validate issue key format
    if (!/^[A-Z][A-Z0-9]*-\d+$/i.test(issueKey)) {
      throw new Error(`Invalid issue key format: ${issueKey}`);
    }

    try {
      const raw = await this.request<unknown>(
        "GET",
        `/issue/${issueKey}/transitions`
      );

      return mapTransitionsResult(raw as Parameters<typeof mapTransitionsResult>[0]);
    } catch (error) {
      if (error instanceof JiraApiError && error.statusCode === 404) {
        throw new JiraNotFoundError(issueKey);
      }
      throw error;
    }
  }

  /**
   * Transitions an issue to a new status.
   *
   * @param input - The transition input
   * @returns Result with the new status
   */
  async transitionIssue(input: TransitionIssueInput): Promise<TransitionIssueResult> {
    // Validate issue key format
    if (!/^[A-Z][A-Z0-9]*-\d+$/i.test(input.issueKey)) {
      throw new Error(`Invalid issue key format: ${input.issueKey}`);
    }

    // Determine the transition ID
    let transitionId = input.transitionId;
    let transitionName = input.transitionName;

    // If transitionName is provided but not transitionId, look it up
    if (!transitionId && transitionName) {
      const availableTransitions = await this.getTransitions(input.issueKey);
      const match = availableTransitions.transitions.find(
        (t) => t.name.toLowerCase() === transitionName!.toLowerCase()
      );

      if (!match) {
        const available = availableTransitions.transitions.map((t) => t.name).join(", ");
        throw new Error(
          `Transition '${transitionName}' not found. Available: ${available}`
        );
      }

      transitionId = match.id;
      transitionName = match.name;
    }

    if (!transitionId) {
      throw new Error("Either transitionId or transitionName must be provided");
    }

    // Build the request body
    const body: Record<string, unknown> = {
      transition: { id: transitionId },
    };

    // Add fields if provided (e.g., resolution)
    if (input.fields) {
      body["fields"] = input.fields;
    }

    // Add comment if provided
    if (input.comment) {
      body["update"] = {
        comment: [
          {
            add: {
              body: textToAdf(input.comment),
            },
          },
        ],
      };
    }

    try {
      await this.request<void>("POST", `/issue/${input.issueKey}/transitions`, {
        body,
      });

      // Get the updated issue to return the new status
      const updatedIssue = await this.getIssue(input.issueKey);

      return {
        success: true,
        issueKey: input.issueKey,
        transitionName: transitionName ?? `Transition ${transitionId}`,
        newStatus: updatedIssue.status.name,
      };
    } catch (error) {
      if (error instanceof JiraApiError && error.statusCode === 404) {
        throw new JiraNotFoundError(input.issueKey);
      }
      throw error;
    }
  }

  // ============================================================================
  // Board and Sprint Operations (Agile API)
  // ============================================================================

  /**
   * Lists boards with optional filters.
   *
   * @param options - Filter and pagination options
   * @returns Paginated boards result
   */
  async getBoards(options?: {
    projectKeyOrId?: string;
    type?: "scrum" | "kanban" | "simple";
    name?: string;
    startAt?: number;
    maxResults?: number;
  }): Promise<JiraBoardsResult> {
    const params: Record<string, string | number | undefined> = {
      startAt: options?.startAt ?? 0,
      maxResults: options?.maxResults ?? 50,
    };

    if (options?.projectKeyOrId) {
      params["projectKeyOrId"] = options.projectKeyOrId;
    }

    if (options?.type) {
      params["type"] = options.type;
    }

    if (options?.name) {
      params["name"] = options.name;
    }

    const raw = await this.request<unknown>("GET", "/board", {
      params,
      api: "agile",
    });

    return mapBoardsResult(raw as Parameters<typeof mapBoardsResult>[0]);
  }

  /**
   * Gets a single board by ID.
   *
   * @param boardId - The board ID
   * @returns The board details
   * @throws JiraBoardNotFoundError if the board doesn't exist
   */
  async getBoard(boardId: number): Promise<JiraBoard> {
    try {
      const raw = await this.request<unknown>("GET", `/board/${boardId}`, {
        api: "agile",
      });

      return mapBoard(raw as Parameters<typeof mapBoard>[0]);
    } catch (error) {
      if (error instanceof JiraApiError && error.statusCode === 404) {
        throw new JiraBoardNotFoundError(boardId);
      }
      throw error;
    }
  }

  /**
   * Lists sprints for a board.
   *
   * @param boardId - The board ID
   * @param options - Filter and pagination options
   * @returns Paginated sprints result
   * @throws JiraBoardNotFoundError if the board doesn't exist
   */
  async getBoardSprints(
    boardId: number,
    options?: {
      state?: "future" | "active" | "closed" | "all";
      startAt?: number;
      maxResults?: number;
    }
  ): Promise<JiraSprintsResult> {
    try {
      const params: Record<string, string | number | undefined> = {
        startAt: options?.startAt ?? 0,
        maxResults: options?.maxResults ?? 50,
      };

      if (options?.state && options.state !== "all") {
        params["state"] = options.state;
      }

      const raw = await this.request<unknown>(
        "GET",
        `/board/${boardId}/sprint`,
        {
          params,
          api: "agile",
        }
      );

      return mapSprintsResult(raw as Parameters<typeof mapSprintsResult>[0]);
    } catch (error) {
      if (error instanceof JiraApiError && error.statusCode === 404) {
        throw new JiraBoardNotFoundError(boardId);
      }
      throw error;
    }
  }

  /**
   * Gets a single sprint by ID.
   *
   * @param sprintId - The sprint ID
   * @returns The sprint details
   * @throws JiraSprintNotFoundError if the sprint doesn't exist
   */
  async getSprint(sprintId: number): Promise<JiraSprintExtended> {
    try {
      const raw = await this.request<unknown>("GET", `/sprint/${sprintId}`, {
        api: "agile",
      });

      return mapSprintExtended(raw as Parameters<typeof mapSprintExtended>[0]);
    } catch (error) {
      if (error instanceof JiraApiError && error.statusCode === 404) {
        throw new JiraSprintNotFoundError(sprintId);
      }
      throw error;
    }
  }

  /**
   * Gets issues in a sprint.
   *
   * @param sprintId - The sprint ID
   * @param options - Pagination and filter options
   * @returns Search result with issues
   * @throws JiraSprintNotFoundError if the sprint doesn't exist
   */
  async getSprintIssues(
    sprintId: number,
    options?: {
      startAt?: number;
      maxResults?: number;
      jql?: string;
    }
  ): Promise<JiraSearchResult> {
    try {
      const params: Record<string, string | number | undefined> = {
        startAt: options?.startAt ?? 0,
        maxResults: options?.maxResults ?? 50,
        fields: this.getSearchFields().join(","),
      };

      if (options?.jql) {
        params["jql"] = options.jql;
      }

      const raw = await this.request<unknown>(
        "GET",
        `/sprint/${sprintId}/issue`,
        {
          params,
          api: "agile",
        }
      );

      return mapSearchResult(raw as Parameters<typeof mapSearchResult>[0]);
    } catch (error) {
      if (error instanceof JiraApiError && error.statusCode === 404) {
        throw new JiraSprintNotFoundError(sprintId);
      }
      throw error;
    }
  }

  /**
   * Moves issues to a sprint.
   *
   * @param input - The move issues input
   * @returns The result of the operation
   * @throws JiraSprintNotFoundError if the sprint doesn't exist
   */
  async moveIssuesToSprint(
    input: MoveIssuesToSprintInput
  ): Promise<MoveIssuesToSprintResult> {
    try {
      await this.request<void>(
        "POST",
        `/sprint/${input.sprintId}/issue`,
        {
          body: {
            issues: [...input.issueKeys],
          },
          api: "agile",
        }
      );

      return {
        success: true,
        sprintId: input.sprintId,
        movedIssues: [...input.issueKeys],
      };
    } catch (error) {
      if (error instanceof JiraApiError && error.statusCode === 404) {
        throw new JiraSprintNotFoundError(input.sprintId);
      }
      throw error;
    }
  }

  /**
   * Updates a sprint.
   *
   * @param input - The update sprint input
   * @returns The updated sprint
   * @throws JiraSprintNotFoundError if the sprint doesn't exist
   * @throws JiraSprintStateError for invalid state transitions
   */
  async updateSprint(input: UpdateSprintInput): Promise<UpdateSprintResult> {
    // First, get the current sprint to validate state transition
    const currentSprint = await this.getSprint(input.sprintId);

    // Validate state transition if state is being changed
    if (input.state && input.state !== currentSprint.state) {
      // Valid transitions:
      // future -> active (start sprint)
      // active -> closed (complete sprint)
      const validTransitions: Record<string, string[]> = {
        future: ["active"],
        active: ["closed"],
        closed: [], // Cannot transition from closed
      };

      if (!validTransitions[currentSprint.state]?.includes(input.state)) {
        throw new JiraSprintStateError(
          input.sprintId,
          currentSprint.state,
          input.state
        );
      }
    }

    // Build the update body
    const body: Record<string, unknown> = {};

    if (input.name !== undefined) {
      body["name"] = input.name;
    }

    if (input.startDate !== undefined) {
      body["startDate"] = input.startDate;
    }

    if (input.endDate !== undefined) {
      body["endDate"] = input.endDate;
    }

    if (input.goal !== undefined) {
      body["goal"] = input.goal;
    }

    if (input.state !== undefined) {
      body["state"] = input.state;
    }

    try {
      const raw = await this.request<unknown>(
        "PUT",
        `/sprint/${input.sprintId}`,
        {
          body,
          api: "agile",
        }
      );

      return {
        success: true,
        sprint: mapSprintExtended(raw as Parameters<typeof mapSprintExtended>[0]),
      };
    } catch (error) {
      if (error instanceof JiraApiError && error.statusCode === 404) {
        throw new JiraSprintNotFoundError(input.sprintId);
      }
      throw error;
    }
  }

  // ============================================================================
  // Field Discovery Operations
  // ============================================================================

  /**
   * Raw field from Jira API.
   */
  private mapField(raw: {
    id: string;
    name: string;
    custom: boolean;
    schema?: { type?: string; custom?: string; items?: string };
  }): JiraField {
    return {
      id: raw.id,
      name: raw.name,
      custom: raw.custom,
      schemaType: raw.schema?.type,
      customType: raw.schema?.custom,
      itemsType: raw.schema?.items,
    };
  }

  /**
   * Gets all available fields from the Jira instance.
   * Useful for discovering custom field IDs for Story Points, Sprint, etc.
   *
   * @returns Array of field definitions
   */
  async getFields(): Promise<JiraField[]> {
    const raw = await this.request<
      Array<{
        id: string;
        name: string;
        custom: boolean;
        schema?: { type?: string; custom?: string; items?: string };
      }>
    >("GET", "/field");

    return raw.map((f) => this.mapField(f));
  }
}
