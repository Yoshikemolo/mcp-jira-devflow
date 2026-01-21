/**
 * Tests for search_jql tool.
 */

import { describe, it, expect, vi } from "vitest";
import { executeSearchJql, SearchJqlInputSchema } from "../../tools/search-jql.js";
import { JiraClient, JiraAuthError } from "../../domain/jira-client.js";
import type { JiraSearchResult } from "../../domain/types.js";

// Mock JiraClient
const createMockClient = () => ({
  getIssue: vi.fn(),
  searchJql: vi.fn(),
  getComments: vi.fn(),
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
  });
});
