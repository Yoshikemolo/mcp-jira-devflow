/**
 * Tests for get_sprint_velocity tool.
 */

import { describe, it, expect, vi } from "vitest";
import { executeSprintVelocity, SprintVelocityInputSchema } from "../../tools/get-sprint-velocity.js";
import { JiraClient, JiraAuthError } from "../../domain/jira-client.js";
import type { JiraSearchResult, JiraIssue, JiraSprint } from "../../domain/types.js";

// Mock JiraClient
const createMockClient = () => ({
  getIssue: vi.fn(),
  searchJql: vi.fn(),
  getComments: vi.fn(),
});

// Helper to create mock sprint
const createMockSprint = (
  id: number,
  name: string,
  state: JiraSprint["state"],
  completeDate?: string
): JiraSprint => ({
  id,
  name,
  state,
  startDate: "2024-01-01T00:00:00.000Z",
  endDate: "2024-01-14T00:00:00.000Z",
  completeDate: completeDate ?? (state === "closed" ? "2024-01-14T12:00:00.000Z" : undefined),
});

// Helper to create mock issues with sprint and story points
const createMockIssue = (
  key: string,
  index: number,
  options: {
    sprint?: JiraSprint;
    sprints?: JiraSprint[];
    storyPoints?: number;
    statusCategoryKey?: "new" | "indeterminate" | "done";
  } = {}
): JiraIssue => ({
  id: `1000${index}`,
  key,
  self: `https://example.atlassian.net/rest/api/3/issue/1000${index}`,
  summary: `Test issue ${index}`,
  status: {
    id: "1",
    name: options.statusCategoryKey === "done" ? "Done" : "Open",
    categoryKey: options.statusCategoryKey ?? "new",
  },
  priority: { id: "1", name: "High" },
  issueType: { id: "1", name: "Story", subtask: false },
  project: { id: "10000", key: "PROJ", name: "Project", projectTypeKey: "software" },
  assignee: { accountId: "123", displayName: "John Doe", active: true },
  created: "2024-01-01T00:00:00.000Z",
  updated: "2024-01-02T00:00:00.000Z",
  labels: [],
  components: [],
  storyPoints: options.storyPoints,
  sprint: options.sprint,
  sprints: options.sprints,
});

describe("get_sprint_velocity tool", () => {
  describe("input validation", () => {
    it("should accept valid project key", () => {
      const result = SprintVelocityInputSchema.safeParse({ projectKey: "PROJ" });
      expect(result.success).toBe(true);
    });

    it("should accept project key with numbers", () => {
      const result = SprintVelocityInputSchema.safeParse({ projectKey: "PROJ2" });
      expect(result.success).toBe(true);
    });

    it("should accept valid sprintCount", () => {
      const result = SprintVelocityInputSchema.safeParse({
        projectKey: "PROJ",
        sprintCount: 3,
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid outputMode values", () => {
      const summaryResult = SprintVelocityInputSchema.safeParse({
        projectKey: "PROJ",
        outputMode: "summary",
      });
      const detailedResult = SprintVelocityInputSchema.safeParse({
        projectKey: "PROJ",
        outputMode: "detailed",
      });
      const fullResult = SprintVelocityInputSchema.safeParse({
        projectKey: "PROJ",
        outputMode: "full",
      });

      expect(summaryResult.success).toBe(true);
      expect(detailedResult.success).toBe(true);
      expect(fullResult.success).toBe(true);
    });

    it("should reject empty project key", () => {
      const result = SprintVelocityInputSchema.safeParse({ projectKey: "" });
      expect(result.success).toBe(false);
    });

    it("should reject invalid project key format", () => {
      const result = SprintVelocityInputSchema.safeParse({ projectKey: "123PROJ" });
      expect(result.success).toBe(false);
    });

    it("should reject sprintCount over 10", () => {
      const result = SprintVelocityInputSchema.safeParse({
        projectKey: "PROJ",
        sprintCount: 15,
      });
      expect(result.success).toBe(false);
    });

    it("should reject sprintCount of 0", () => {
      const result = SprintVelocityInputSchema.safeParse({
        projectKey: "PROJ",
        sprintCount: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid outputMode", () => {
      const result = SprintVelocityInputSchema.safeParse({
        projectKey: "PROJ",
        outputMode: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("executeSprintVelocity", () => {
    it("should return velocity metrics on success", async () => {
      const sprint1 = createMockSprint(1, "Sprint 1", "closed");
      const mockResult: JiraSearchResult = {
        issues: [
          createMockIssue("PROJ-1", 1, {
            sprint: sprint1,
            sprints: [sprint1],
            storyPoints: 5,
            statusCategoryKey: "done",
          }),
          createMockIssue("PROJ-2", 2, {
            sprint: sprint1,
            sprints: [sprint1],
            storyPoints: 3,
            statusCategoryKey: "done",
          }),
        ],
        startAt: 0,
        maxResults: 50,
        total: 2,
        isLast: true,
      };

      const client = createMockClient();
      client.searchJql.mockResolvedValue(mockResult);

      const result = await executeSprintVelocity(
        client as unknown as JiraClient,
        { projectKey: "PROJ" }
      );

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);

      const parsed = JSON.parse(result.content[0]?.text ?? "{}");
      expect(parsed.projectKey).toBe("PROJ");
      expect(parsed.sprintCount).toBe(1);
      expect(parsed.totalCompletedPoints).toBe(8);
      expect(parsed.totalCompletedIssues).toBe(2);
      expect(parsed.averageVelocity).toBe(8);
    });

    it("should handle no closed sprints found", async () => {
      const mockResult: JiraSearchResult = {
        issues: [],
        startAt: 0,
        maxResults: 50,
        total: 0,
        isLast: true,
      };

      const client = createMockClient();
      client.searchJql.mockResolvedValue(mockResult);

      const result = await executeSprintVelocity(
        client as unknown as JiraClient,
        { projectKey: "PROJ" }
      );

      expect(result.isError).toBeUndefined();

      const parsed = JSON.parse(result.content[0]?.text ?? "{}");
      expect(parsed.sprintCount).toBe(0);
      expect(parsed.averageVelocity).toBe(0);
      expect(parsed._info).toContain("No closed sprints found");
    });

    it("should calculate committed vs completed points correctly", async () => {
      const sprint1 = createMockSprint(1, "Sprint 1", "closed");
      const mockResult: JiraSearchResult = {
        issues: [
          createMockIssue("PROJ-1", 1, {
            sprint: sprint1,
            sprints: [sprint1],
            storyPoints: 5,
            statusCategoryKey: "done",
          }),
          createMockIssue("PROJ-2", 2, {
            sprint: sprint1,
            sprints: [sprint1],
            storyPoints: 3,
            statusCategoryKey: "indeterminate", // Not done
          }),
        ],
        startAt: 0,
        maxResults: 50,
        total: 2,
        isLast: true,
      };

      const client = createMockClient();
      client.searchJql.mockResolvedValue(mockResult);

      const result = await executeSprintVelocity(
        client as unknown as JiraClient,
        { projectKey: "PROJ", outputMode: "detailed" }
      );

      const parsed = JSON.parse(result.content[0]?.text ?? "{}");
      expect(parsed.sprints).toHaveLength(1);
      expect(parsed.sprints[0].completedPoints).toBe(5);
      expect(parsed.sprints[0].committedPoints).toBe(8);
      expect(parsed.sprints[0].completedIssues).toBe(1);
      expect(parsed.sprints[0].committedIssues).toBe(2);
    });

    it("should return error for auth failure", async () => {
      const client = createMockClient();
      client.searchJql.mockRejectedValue(new JiraAuthError());

      const result = await executeSprintVelocity(
        client as unknown as JiraClient,
        { projectKey: "PROJ" }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain("Authentication failed");
    });

    it("should return validation error for invalid input", async () => {
      const client = createMockClient();

      const result = await executeSprintVelocity(
        client as unknown as JiraClient,
        { projectKey: "" }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain("Validation error");
    });

    it("should respect outputMode summary", async () => {
      const sprint1 = createMockSprint(1, "Sprint 1", "closed");
      const mockResult: JiraSearchResult = {
        issues: [
          createMockIssue("PROJ-1", 1, {
            sprint: sprint1,
            sprints: [sprint1],
            storyPoints: 5,
            statusCategoryKey: "done",
          }),
        ],
        startAt: 0,
        maxResults: 50,
        total: 1,
        isLast: true,
      };

      const client = createMockClient();
      client.searchJql.mockResolvedValue(mockResult);

      const result = await executeSprintVelocity(
        client as unknown as JiraClient,
        { projectKey: "PROJ", outputMode: "summary" }
      );

      const parsed = JSON.parse(result.content[0]?.text ?? "{}");
      expect(parsed.outputMode).toBe("summary");
      expect(parsed.sprints).toBeUndefined();
      expect(parsed.issues).toBeUndefined();
      expect(parsed.averageVelocity).toBeDefined();
    });

    it("should include sprint details in detailed mode", async () => {
      const sprint1 = createMockSprint(1, "Sprint 1", "closed");
      const mockResult: JiraSearchResult = {
        issues: [
          createMockIssue("PROJ-1", 1, {
            sprint: sprint1,
            sprints: [sprint1],
            storyPoints: 5,
            statusCategoryKey: "done",
          }),
        ],
        startAt: 0,
        maxResults: 50,
        total: 1,
        isLast: true,
      };

      const client = createMockClient();
      client.searchJql.mockResolvedValue(mockResult);

      const result = await executeSprintVelocity(
        client as unknown as JiraClient,
        { projectKey: "PROJ", outputMode: "detailed" }
      );

      const parsed = JSON.parse(result.content[0]?.text ?? "{}");
      expect(parsed.outputMode).toBe("detailed");
      expect(parsed.sprints).toBeDefined();
      expect(parsed.sprints).toHaveLength(1);
      expect(parsed.sprints[0].name).toBe("Sprint 1");
      expect(parsed.issues).toBeUndefined();
    });

    it("should include issues in full mode", async () => {
      const sprint1 = createMockSprint(1, "Sprint 1", "closed");
      const mockResult: JiraSearchResult = {
        issues: [
          createMockIssue("PROJ-1", 1, {
            sprint: sprint1,
            sprints: [sprint1],
            storyPoints: 5,
            statusCategoryKey: "done",
          }),
        ],
        startAt: 0,
        maxResults: 50,
        total: 1,
        isLast: true,
      };

      const client = createMockClient();
      client.searchJql.mockResolvedValue(mockResult);

      const result = await executeSprintVelocity(
        client as unknown as JiraClient,
        { projectKey: "PROJ", outputMode: "full" }
      );

      const parsed = JSON.parse(result.content[0]?.text ?? "{}");
      expect(parsed.outputMode).toBe("full");
      expect(parsed.sprints).toBeDefined();
      expect(parsed.issues).toBeDefined();
      expect(parsed.issues).toHaveLength(1);
      expect(parsed.issues[0].key).toBe("PROJ-1");
    });

    it("should handle issues without story points", async () => {
      const sprint1 = createMockSprint(1, "Sprint 1", "closed");
      const mockResult: JiraSearchResult = {
        issues: [
          createMockIssue("PROJ-1", 1, {
            sprint: sprint1,
            sprints: [sprint1],
            // storyPoints omitted - defaults to undefined
            statusCategoryKey: "done",
          }),
          createMockIssue("PROJ-2", 2, {
            sprint: sprint1,
            sprints: [sprint1],
            // storyPoints omitted - defaults to undefined
            statusCategoryKey: "done",
          }),
        ],
        startAt: 0,
        maxResults: 50,
        total: 2,
        isLast: true,
      };

      const client = createMockClient();
      client.searchJql.mockResolvedValue(mockResult);

      const result = await executeSprintVelocity(
        client as unknown as JiraClient,
        { projectKey: "PROJ" }
      );

      const parsed = JSON.parse(result.content[0]?.text ?? "{}");
      expect(parsed.totalCompletedPoints).toBe(0);
      expect(parsed.totalCompletedIssues).toBe(2);
      expect(parsed._info).toContain("No story points found");
    });

    it("should limit to requested sprint count", async () => {
      // Create sprints with different completion dates
      const sprint1 = createMockSprint(1, "Sprint 1", "closed", "2024-01-14T12:00:00.000Z");
      const sprint2 = createMockSprint(2, "Sprint 2", "closed", "2024-02-14T12:00:00.000Z");
      const sprint3 = createMockSprint(3, "Sprint 3", "closed", "2024-03-14T12:00:00.000Z");

      const mockResult: JiraSearchResult = {
        issues: [
          createMockIssue("PROJ-1", 1, {
            sprint: sprint1,
            sprints: [sprint1],
            storyPoints: 3,
            statusCategoryKey: "done",
          }),
          createMockIssue("PROJ-2", 2, {
            sprint: sprint2,
            sprints: [sprint2],
            storyPoints: 5,
            statusCategoryKey: "done",
          }),
          createMockIssue("PROJ-3", 3, {
            sprint: sprint3,
            sprints: [sprint3],
            storyPoints: 8,
            statusCategoryKey: "done",
          }),
        ],
        startAt: 0,
        maxResults: 50,
        total: 3,
        isLast: true,
      };

      const client = createMockClient();
      client.searchJql.mockResolvedValue(mockResult);

      const result = await executeSprintVelocity(
        client as unknown as JiraClient,
        { projectKey: "PROJ", sprintCount: 2, outputMode: "detailed" }
      );

      const parsed = JSON.parse(result.content[0]?.text ?? "{}");
      expect(parsed.sprintCount).toBe(2);
      expect(parsed.sprints).toHaveLength(2);
      // Should have the 2 most recent sprints (sprint3 and sprint2)
      expect(parsed.sprints.map((s: { name: string }) => s.name)).toContain("Sprint 3");
      expect(parsed.sprints.map((s: { name: string }) => s.name)).toContain("Sprint 2");
    });

    it("should uppercase project key", async () => {
      const mockResult: JiraSearchResult = {
        issues: [],
        startAt: 0,
        maxResults: 50,
        total: 0,
        isLast: true,
      };

      const client = createMockClient();
      client.searchJql.mockResolvedValue(mockResult);

      const result = await executeSprintVelocity(
        client as unknown as JiraClient,
        { projectKey: "proj" }
      );

      const parsed = JSON.parse(result.content[0]?.text ?? "{}");
      expect(parsed.projectKey).toBe("PROJ");
    });
  });
});
