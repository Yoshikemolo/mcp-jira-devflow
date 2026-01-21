/**
 * Tests for search_jql tool.
 */

import { describe, it, expect, vi } from "vitest";
import { executeSearchJql, SearchJqlInputSchema } from "../../tools/search-jql.js";
import { JiraClient, JiraAuthError } from "../../domain/jira-client.js";
import type { JiraSearchResult, JiraIssue } from "../../domain/types.js";

// Mock JiraClient
const createMockClient = () => ({
  getIssue: vi.fn(),
  searchJql: vi.fn(),
  getComments: vi.fn(),
});

// Helper to create mock issues
const createMockIssue = (key: string, index: number): JiraIssue => ({
  id: `1000${index}`,
  key,
  self: `https://example.atlassian.net/rest/api/3/issue/1000${index}`,
  summary: `Test issue ${index}`,
  status: { id: "1", name: "Open", categoryKey: "new" },
  priority: { id: "1", name: "High" },
  issueType: { id: "1", name: "Bug", subtask: false },
  project: { id: "10000", key: "PROJ", name: "Project", projectTypeKey: "software" },
  assignee: { accountId: "123", displayName: "John Doe", active: true },
  created: "2024-01-01T00:00:00.000Z",
  updated: "2024-01-02T00:00:00.000Z",
  labels: [],
  components: [],
});

describe("search_jql tool", () => {
  describe("input validation", () => {
    it("should accept valid JQL query", () => {
      const result = SearchJqlInputSchema.safeParse({ jql: "project = PROJ" });
      expect(result.success).toBe(true);
    });

    it("should accept JQL with pagination params", () => {
      const result = SearchJqlInputSchema.safeParse({
        jql: "project = PROJ",
        startAt: 10,
        maxResults: 25,
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid outputMode values", () => {
      const autoResult = SearchJqlInputSchema.safeParse({ jql: "project = PROJ", outputMode: "auto" });
      const compactResult = SearchJqlInputSchema.safeParse({ jql: "project = PROJ", outputMode: "compact" });
      const fullResult = SearchJqlInputSchema.safeParse({ jql: "project = PROJ", outputMode: "full" });

      expect(autoResult.success).toBe(true);
      expect(compactResult.success).toBe(true);
      expect(fullResult.success).toBe(true);
    });

    it("should reject invalid outputMode", () => {
      const result = SearchJqlInputSchema.safeParse({ jql: "project = PROJ", outputMode: "invalid" });
      expect(result.success).toBe(false);
    });

    it("should reject empty JQL", () => {
      const result = SearchJqlInputSchema.safeParse({ jql: "" });
      expect(result.success).toBe(false);
    });

    it("should reject maxResults over 50", () => {
      const result = SearchJqlInputSchema.safeParse({
        jql: "project = PROJ",
        maxResults: 100,
      });
      expect(result.success).toBe(false);
    });

    it("should reject negative startAt", () => {
      const result = SearchJqlInputSchema.safeParse({
        jql: "project = PROJ",
        startAt: -1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("executeSearchJql", () => {
    it("should return search results on success", async () => {
      const mockResult: JiraSearchResult = {
        issues: [
          {
            id: "10001",
            key: "PROJ-123",
            self: "https://example.atlassian.net/rest/api/3/issue/10001",
            summary: "Test issue",
            status: { id: "1", name: "Open", categoryKey: "new" },
            issueType: { id: "1", name: "Bug", subtask: false },
            project: { id: "10000", key: "PROJ", name: "Project", projectTypeKey: "software" },
            created: "2024-01-01T00:00:00.000Z",
            updated: "2024-01-02T00:00:00.000Z",
            labels: [],
            components: [],
          },
        ],
        startAt: 0,
        maxResults: 50,
        total: 1,
        isLast: true,
      };

      const client = createMockClient();
      client.searchJql.mockResolvedValue(mockResult);

      const result = await executeSearchJql(
        client as unknown as JiraClient,
        { jql: "project = PROJ" }
      );

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);

      const parsed = JSON.parse(result.content[0]?.text ?? "{}");
      expect(parsed.total).toBe(1);
      expect(parsed.issues).toHaveLength(1);
      expect(parsed.issues[0].key).toBe("PROJ-123");
    });

    it("should return empty results for no matches", async () => {
      const mockResult: JiraSearchResult = {
        issues: [],
        startAt: 0,
        maxResults: 50,
        total: 0,
        isLast: true,
      };

      const client = createMockClient();
      client.searchJql.mockResolvedValue(mockResult);

      const result = await executeSearchJql(
        client as unknown as JiraClient,
        { jql: "project = NONEXISTENT" }
      );

      expect(result.isError).toBeUndefined();

      const parsed = JSON.parse(result.content[0]?.text ?? "{}");
      expect(parsed.total).toBe(0);
      expect(parsed.issues).toHaveLength(0);
    });

    it("should return error for auth failure", async () => {
      const client = createMockClient();
      client.searchJql.mockRejectedValue(new JiraAuthError());

      const result = await executeSearchJql(
        client as unknown as JiraClient,
        { jql: "project = PROJ" }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain("Authentication failed");
    });

    it("should return validation error for invalid input", async () => {
      const client = createMockClient();

      const result = await executeSearchJql(
        client as unknown as JiraClient,
        { jql: "" }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain("Validation error");
    });

    it("should return full format for <= 5 results in auto mode", async () => {
      const mockResult: JiraSearchResult = {
        issues: [
          createMockIssue("PROJ-1", 1),
          createMockIssue("PROJ-2", 2),
          createMockIssue("PROJ-3", 3),
        ],
        startAt: 0,
        maxResults: 50,
        total: 3,
        isLast: true,
      };

      const client = createMockClient();
      client.searchJql.mockResolvedValue(mockResult);

      const result = await executeSearchJql(
        client as unknown as JiraClient,
        { jql: "project = PROJ" }
      );

      const parsed = JSON.parse(result.content[0]?.text ?? "{}");
      expect(parsed.outputMode).toBe("full");
      expect(parsed._info).toBeUndefined();
      // Full format includes nested objects
      expect(parsed.issues[0].status).toHaveProperty("id");
      expect(parsed.issues[0].status).toHaveProperty("name");
    });

    it("should return compact format for > 5 results in auto mode", async () => {
      const mockResult: JiraSearchResult = {
        issues: Array.from({ length: 10 }, (_, i) => createMockIssue(`PROJ-${i + 1}`, i + 1)),
        startAt: 0,
        maxResults: 50,
        total: 10,
        isLast: true,
      };

      const client = createMockClient();
      client.searchJql.mockResolvedValue(mockResult);

      const result = await executeSearchJql(
        client as unknown as JiraClient,
        { jql: "project = PROJ" }
      );

      const parsed = JSON.parse(result.content[0]?.text ?? "{}");
      expect(parsed.outputMode).toBe("compact");
      expect(parsed._info).toBeDefined();
      expect(parsed._info).toContain("Compact mode was automatically activated");
      // Compact format has flat string fields
      expect(parsed.issues[0].status).toBe("Open");
      expect(parsed.issues[0].key).toBe("PROJ-1");
      expect(parsed.issues[0].assignee).toBe("John Doe");
      // Compact format should not have nested objects
      expect(parsed.issues[0].project).toBeUndefined();
    });

    it("should force compact format when outputMode is compact", async () => {
      const mockResult: JiraSearchResult = {
        issues: [createMockIssue("PROJ-1", 1)], // Only 1 result
        startAt: 0,
        maxResults: 50,
        total: 1,
        isLast: true,
      };

      const client = createMockClient();
      client.searchJql.mockResolvedValue(mockResult);

      const result = await executeSearchJql(
        client as unknown as JiraClient,
        { jql: "project = PROJ", outputMode: "compact" }
      );

      const parsed = JSON.parse(result.content[0]?.text ?? "{}");
      expect(parsed.outputMode).toBe("compact");
      expect(parsed._info).toBeDefined();
      expect(parsed._info).toContain("Compact mode is active");
    });

    it("should force full format when outputMode is full", async () => {
      const mockResult: JiraSearchResult = {
        issues: Array.from({ length: 20 }, (_, i) => createMockIssue(`PROJ-${i + 1}`, i + 1)),
        startAt: 0,
        maxResults: 50,
        total: 20,
        isLast: true,
      };

      const client = createMockClient();
      client.searchJql.mockResolvedValue(mockResult);

      const result = await executeSearchJql(
        client as unknown as JiraClient,
        { jql: "project = PROJ", outputMode: "full" }
      );

      const parsed = JSON.parse(result.content[0]?.text ?? "{}");
      expect(parsed.outputMode).toBe("full");
      expect(parsed._info).toBeUndefined();
      // Full format includes nested objects
      expect(parsed.issues[0].status).toHaveProperty("id");
    });
  });
});
