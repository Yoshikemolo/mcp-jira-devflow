/**
 * Tests for get_issue tool.
 */

import { describe, it, expect, vi } from "vitest";
import { executeGetIssue, GetIssueInputSchema } from "../../tools/get-issue.js";
import { JiraClient, JiraNotFoundError, JiraAuthError } from "../../domain/jira-client.js";
import type { JiraIssue } from "../../domain/types.js";

// Mock JiraClient
const createMockClient = () => ({
  getIssue: vi.fn(),
  searchJql: vi.fn(),
  getComments: vi.fn(),
});

describe("get_issue tool", () => {
  describe("input validation", () => {
    it("should accept valid issue key", () => {
      const result = GetIssueInputSchema.safeParse({ issueKey: "PROJ-123" });
      expect(result.success).toBe(true);
    });

    it("should accept issue key with numbers in project", () => {
      const result = GetIssueInputSchema.safeParse({ issueKey: "PROJ2-456" });
      expect(result.success).toBe(true);
    });

    it("should reject invalid issue key format", () => {
      const result = GetIssueInputSchema.safeParse({ issueKey: "invalid" });
      expect(result.success).toBe(false);
    });

    it("should reject issue key without number", () => {
      const result = GetIssueInputSchema.safeParse({ issueKey: "PROJ-" });
      expect(result.success).toBe(false);
    });

    it("should reject missing issue key", () => {
      const result = GetIssueInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("executeGetIssue", () => {
    it("should return issue data on success", async () => {
      const mockIssue: JiraIssue = {
        id: "10001",
        key: "PROJ-123",
        self: "https://example.atlassian.net/rest/api/3/issue/10001",
        summary: "Test issue",
        description: "Test description",
        status: { id: "1", name: "Open", categoryKey: "new" },
        issueType: { id: "1", name: "Bug", subtask: false },
        project: { id: "10000", key: "PROJ", name: "Project", projectTypeKey: "software" },
        created: "2024-01-01T00:00:00.000Z",
        updated: "2024-01-02T00:00:00.000Z",
        labels: [],
        components: [],
      };

      const client = createMockClient();
      client.getIssue.mockResolvedValue(mockIssue);

      const result = await executeGetIssue(
        client as unknown as JiraClient,
        { issueKey: "PROJ-123" }
      );

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe("text");

      const parsed = JSON.parse(result.content[0]?.text ?? "{}");
      expect(parsed.key).toBe("PROJ-123");
      expect(parsed.summary).toBe("Test issue");
    });

    it("should return error for not found issue", async () => {
      const client = createMockClient();
      client.getIssue.mockRejectedValue(new JiraNotFoundError("PROJ-999"));

      const result = await executeGetIssue(
        client as unknown as JiraClient,
        { issueKey: "PROJ-999" }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain("not found");
    });

    it("should return error for auth failure", async () => {
      const client = createMockClient();
      client.getIssue.mockRejectedValue(new JiraAuthError());

      const result = await executeGetIssue(
        client as unknown as JiraClient,
        { issueKey: "PROJ-123" }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain("Authentication failed");
    });

    it("should return validation error for invalid input", async () => {
      const client = createMockClient();

      const result = await executeGetIssue(
        client as unknown as JiraClient,
        { issueKey: "invalid" }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain("Validation error");
    });
  });
});
