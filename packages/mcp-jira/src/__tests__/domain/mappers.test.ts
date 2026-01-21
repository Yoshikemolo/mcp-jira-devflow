/**
 * Tests for API response mappers.
 */

import { describe, it, expect } from "vitest";
import {
  mapUser,
  mapStatus,
  mapPriority,
  mapIssueType,
  mapProject,
  mapComponent,
  mapIssue,
  mapIssueCompact,
  mapComment,
  mapSprint,
  extractStoryPoints,
  extractSprints,
  STORY_POINTS_FIELD_CANDIDATES,
  SPRINT_FIELD_CANDIDATES,
} from "../../domain/mappers.js";

describe("mappers", () => {
  describe("mapUser", () => {
    it("should map a complete user", () => {
      const raw = {
        accountId: "123456",
        displayName: "John Doe",
        emailAddress: "john@example.com",
        avatarUrls: {
          "48x48": "https://example.com/avatar.png",
        },
        active: true,
      };

      const result = mapUser(raw);

      expect(result).toEqual({
        accountId: "123456",
        displayName: "John Doe",
        emailAddress: "john@example.com",
        avatarUrl: "https://example.com/avatar.png",
        active: true,
      });
    });

    it("should handle missing optional fields", () => {
      const raw = {
        accountId: "123456",
        displayName: "John Doe",
      };

      const result = mapUser(raw);

      expect(result.accountId).toBe("123456");
      expect(result.displayName).toBe("John Doe");
      expect(result.emailAddress).toBeUndefined();
      expect(result.avatarUrl).toBeUndefined();
      expect(result.active).toBe(true);
    });
  });

  describe("mapStatus", () => {
    it("should map a status with category", () => {
      const raw = {
        id: "1",
        name: "Open",
        description: "The issue is open",
        statusCategory: {
          key: "new",
        },
      };

      const result = mapStatus(raw);

      expect(result).toEqual({
        id: "1",
        name: "Open",
        description: "The issue is open",
        categoryKey: "new",
      });
    });

    it("should default to undefined category", () => {
      const raw = {
        id: "1",
        name: "Unknown",
      };

      const result = mapStatus(raw);

      expect(result.categoryKey).toBe("undefined");
    });

    it("should handle invalid category keys", () => {
      const raw = {
        id: "1",
        name: "Custom",
        statusCategory: {
          key: "invalid_category",
        },
      };

      const result = mapStatus(raw);

      expect(result.categoryKey).toBe("undefined");
    });
  });

  describe("mapPriority", () => {
    it("should map a priority", () => {
      const raw = {
        id: "1",
        name: "High",
        iconUrl: "https://example.com/icon.png",
      };

      const result = mapPriority(raw);

      expect(result).toEqual({
        id: "1",
        name: "High",
        iconUrl: "https://example.com/icon.png",
      });
    });
  });

  describe("mapIssueType", () => {
    it("should map an issue type", () => {
      const raw = {
        id: "1",
        name: "Bug",
        description: "A bug in the system",
        iconUrl: "https://example.com/bug.png",
        subtask: false,
      };

      const result = mapIssueType(raw);

      expect(result).toEqual({
        id: "1",
        name: "Bug",
        description: "A bug in the system",
        iconUrl: "https://example.com/bug.png",
        subtask: false,
      });
    });

    it("should default subtask to false", () => {
      const raw = {
        id: "1",
        name: "Task",
      };

      const result = mapIssueType(raw);

      expect(result.subtask).toBe(false);
    });
  });

  describe("mapProject", () => {
    it("should map a project", () => {
      const raw = {
        id: "10000",
        key: "PROJ",
        name: "My Project",
        projectTypeKey: "software",
        avatarUrls: {
          "48x48": "https://example.com/project.png",
        },
      };

      const result = mapProject(raw);

      expect(result).toEqual({
        id: "10000",
        key: "PROJ",
        name: "My Project",
        projectTypeKey: "software",
        avatarUrl: "https://example.com/project.png",
      });
    });
  });

  describe("mapComponent", () => {
    it("should map a component", () => {
      const raw = {
        id: "1",
        name: "Backend",
        description: "Backend components",
      };

      const result = mapComponent(raw);

      expect(result).toEqual({
        id: "1",
        name: "Backend",
        description: "Backend components",
      });
    });
  });

  describe("mapIssue", () => {
    it("should map a complete issue", () => {
      const raw = {
        id: "10001",
        key: "PROJ-123",
        self: "https://example.atlassian.net/rest/api/3/issue/10001",
        fields: {
          summary: "Test issue",
          description: "Test description",
          status: {
            id: "1",
            name: "Open",
            statusCategory: { key: "new" },
          },
          priority: {
            id: "1",
            name: "High",
          },
          issuetype: {
            id: "1",
            name: "Bug",
          },
          project: {
            id: "10000",
            key: "PROJ",
            name: "My Project",
          },
          assignee: {
            accountId: "123",
            displayName: "John Doe",
          },
          reporter: {
            accountId: "456",
            displayName: "Jane Doe",
          },
          created: "2024-01-01T00:00:00.000Z",
          updated: "2024-01-02T00:00:00.000Z",
          labels: ["bug", "critical"],
          components: [{ id: "1", name: "Backend" }],
        },
      };

      const result = mapIssue(raw);

      expect(result.key).toBe("PROJ-123");
      expect(result.summary).toBe("Test issue");
      expect(result.status.name).toBe("Open");
      expect(result.priority?.name).toBe("High");
      expect(result.assignee?.displayName).toBe("John Doe");
      expect(result.labels).toEqual(["bug", "critical"]);
      expect(result.components).toHaveLength(1);
    });

    it("should handle missing optional fields", () => {
      const raw = {
        id: "10001",
        key: "PROJ-123",
        self: "https://example.atlassian.net/rest/api/3/issue/10001",
        fields: {
          summary: "Test issue",
          status: {
            id: "1",
            name: "Open",
          },
          issuetype: {
            id: "1",
            name: "Task",
          },
          project: {
            id: "10000",
            key: "PROJ",
            name: "My Project",
          },
          created: "2024-01-01T00:00:00.000Z",
          updated: "2024-01-02T00:00:00.000Z",
        },
      };

      const result = mapIssue(raw);

      expect(result.description).toBeUndefined();
      expect(result.priority).toBeUndefined();
      expect(result.assignee).toBeUndefined();
      expect(result.labels).toEqual([]);
      expect(result.components).toEqual([]);
    });
  });

  describe("mapComment", () => {
    it("should map a comment with plain text body", () => {
      const raw = {
        id: "1",
        author: {
          accountId: "123",
          displayName: "John Doe",
        },
        body: "This is a comment",
        created: "2024-01-01T00:00:00.000Z",
        updated: "2024-01-02T00:00:00.000Z",
      };

      const result = mapComment(raw);

      expect(result).toEqual({
        id: "1",
        author: {
          accountId: "123",
          displayName: "John Doe",
          emailAddress: undefined,
          avatarUrl: undefined,
          active: true,
        },
        body: "This is a comment",
        created: "2024-01-01T00:00:00.000Z",
        updated: "2024-01-02T00:00:00.000Z",
      });
    });

    it("should extract text from ADF body", () => {
      const raw = {
        id: "1",
        author: {
          accountId: "123",
          displayName: "John Doe",
        },
        body: {
          content: [
            {
              content: [{ text: "Hello " }, { text: "World" }],
            },
            {
              content: [{ text: "Second line" }],
            },
          ],
        },
        created: "2024-01-01T00:00:00.000Z",
        updated: "2024-01-02T00:00:00.000Z",
      };

      const result = mapComment(raw);

      // Each content block creates a new line, text within blocks is separated by newlines too
      expect(result.body).toBe("Hello \nWorld\nSecond line");
    });
  });

  describe("mapIssueCompact", () => {
    it("should map an issue to compact format with only essential fields", () => {
      const raw = {
        id: "10001",
        key: "PROJ-123",
        self: "https://example.atlassian.net/rest/api/3/issue/10001",
        fields: {
          summary: "Test issue",
          description: "This is a very long description that should not appear in compact format",
          status: {
            id: "1",
            name: "In Progress",
            statusCategory: { key: "indeterminate" },
          },
          priority: {
            id: "2",
            name: "High",
          },
          issuetype: {
            id: "1",
            name: "Bug",
          },
          project: {
            id: "10000",
            key: "PROJ",
            name: "My Project",
          },
          assignee: {
            accountId: "123",
            displayName: "John Doe",
          },
          reporter: {
            accountId: "456",
            displayName: "Jane Doe",
          },
          created: "2024-01-01T00:00:00.000Z",
          updated: "2024-01-02T00:00:00.000Z",
          labels: ["bug", "critical"],
          components: [{ id: "1", name: "Backend" }],
        },
      };

      const result = mapIssueCompact(raw);

      expect(result).toEqual({
        key: "PROJ-123",
        summary: "Test issue",
        status: "In Progress",
        priority: "High",
        assignee: "John Doe",
        issueType: "Bug",
      });

      // Verify excluded fields - cast to unknown first for type safety
      const resultObj = result as unknown as Record<string, unknown>;
      expect(resultObj["id"]).toBeUndefined();
      expect(resultObj["description"]).toBeUndefined();
      expect(resultObj["project"]).toBeUndefined();
      expect(resultObj["reporter"]).toBeUndefined();
      expect(resultObj["labels"]).toBeUndefined();
    });

    it("should handle missing optional fields in compact format", () => {
      const raw = {
        id: "10001",
        key: "PROJ-456",
        self: "https://example.atlassian.net/rest/api/3/issue/10001",
        fields: {
          summary: "Unassigned task",
          status: {
            id: "1",
            name: "Open",
          },
          issuetype: {
            id: "2",
            name: "Task",
          },
          project: {
            id: "10000",
            key: "PROJ",
            name: "My Project",
          },
          created: "2024-01-01T00:00:00.000Z",
          updated: "2024-01-02T00:00:00.000Z",
        },
      };

      const result = mapIssueCompact(raw);

      expect(result).toEqual({
        key: "PROJ-456",
        summary: "Unassigned task",
        status: "Open",
        priority: undefined,
        assignee: undefined,
        issueType: "Task",
        storyPoints: undefined,
      });
    });

    it("should include storyPoints in compact format", () => {
      const raw = {
        id: "10001",
        key: "PROJ-789",
        self: "https://example.atlassian.net/rest/api/3/issue/10001",
        fields: {
          summary: "Task with points",
          status: {
            id: "1",
            name: "Done",
          },
          issuetype: {
            id: "1",
            name: "Story",
          },
          project: {
            id: "10000",
            key: "PROJ",
            name: "My Project",
          },
          created: "2024-01-01T00:00:00.000Z",
          updated: "2024-01-02T00:00:00.000Z",
          customfield_10016: 5,
        },
      };

      const result = mapIssueCompact(raw);

      expect(result.storyPoints).toBe(5);
    });
  });

  describe("mapSprint", () => {
    it("should map a complete sprint", () => {
      const raw = {
        id: 123,
        name: "Sprint 1",
        state: "closed",
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-14T00:00:00.000Z",
        completeDate: "2024-01-14T12:00:00.000Z",
        goal: "Complete feature X",
      };

      const result = mapSprint(raw);

      expect(result).toEqual({
        id: 123,
        name: "Sprint 1",
        state: "closed",
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-14T00:00:00.000Z",
        completeDate: "2024-01-14T12:00:00.000Z",
        goal: "Complete feature X",
      });
    });

    it("should map an active sprint", () => {
      const raw = {
        id: 124,
        name: "Sprint 2",
        state: "active",
        startDate: "2024-01-15T00:00:00.000Z",
        endDate: "2024-01-28T00:00:00.000Z",
      };

      const result = mapSprint(raw);

      expect(result.id).toBe(124);
      expect(result.state).toBe("active");
      expect(result.completeDate).toBeUndefined();
    });

    it("should map a future sprint", () => {
      const raw = {
        id: 125,
        name: "Sprint 3",
        state: "future",
      };

      const result = mapSprint(raw);

      expect(result.state).toBe("future");
      expect(result.startDate).toBeUndefined();
    });

    it("should default to future state for unknown states", () => {
      const raw = {
        id: 126,
        name: "Sprint Unknown",
        state: "unknown_state",
      };

      const result = mapSprint(raw);

      expect(result.state).toBe("future");
    });
  });

  describe("extractStoryPoints", () => {
    it("should extract story points from first matching custom field", () => {
      const fields = {
        customfield_10016: 8,
        customfield_10026: 5,
      };

      const result = extractStoryPoints(fields);

      expect(result).toBe(8);
    });

    it("should return undefined when no story points found", () => {
      const fields = {
        summary: "Test",
        status: { id: "1", name: "Open" },
      };

      const result = extractStoryPoints(fields);

      expect(result).toBeUndefined();
    });

    it("should skip non-numeric values", () => {
      const fields = {
        customfield_10016: "not a number",
        customfield_10026: 3,
      };

      const result = extractStoryPoints(fields);

      expect(result).toBe(3);
    });

    it("should skip NaN values", () => {
      const fields = {
        customfield_10016: NaN,
        customfield_10026: 5,
      };

      const result = extractStoryPoints(fields);

      expect(result).toBe(5);
    });

    it("should handle zero as a valid value", () => {
      const fields = {
        customfield_10016: 0,
      };

      const result = extractStoryPoints(fields);

      expect(result).toBe(0);
    });
  });

  describe("extractSprints", () => {
    it("should extract sprints from custom field array", () => {
      const fields = {
        customfield_10020: [
          {
            id: 1,
            name: "Sprint 1",
            state: "closed",
            completeDate: "2024-01-14T00:00:00.000Z",
          },
          {
            id: 2,
            name: "Sprint 2",
            state: "active",
          },
        ],
      };

      const result = extractSprints(fields);

      expect(result.sprints).toHaveLength(2);
      expect(result.sprint?.id).toBe(2); // Active sprint is preferred
    });

    it("should return most recent sprint when no active sprint", () => {
      const fields = {
        customfield_10020: [
          {
            id: 1,
            name: "Sprint 1",
            state: "closed",
          },
          {
            id: 2,
            name: "Sprint 2",
            state: "closed",
          },
        ],
      };

      const result = extractSprints(fields);

      expect(result.sprint?.id).toBe(2); // Last in array is most recent
    });

    it("should return empty object when no sprints found", () => {
      const fields = {
        summary: "Test",
      };

      const result = extractSprints(fields);

      expect(result.sprint).toBeUndefined();
      expect(result.sprints).toBeUndefined();
    });

    it("should skip invalid sprint objects", () => {
      const fields = {
        customfield_10020: [
          { invalid: "object" },
          {
            id: 1,
            name: "Sprint 1",
            state: "active",
          },
        ],
      };

      const result = extractSprints(fields);

      expect(result.sprints).toHaveLength(1);
      expect(result.sprint?.id).toBe(1);
    });

    it("should try multiple custom field candidates", () => {
      const fields = {
        customfield_10007: [
          {
            id: 1,
            name: "Sprint 1",
            state: "active",
          },
        ],
      };

      const result = extractSprints(fields);

      expect(result.sprint?.id).toBe(1);
    });
  });

  describe("mapIssue with sprint and storyPoints", () => {
    it("should include storyPoints and sprint in mapped issue", () => {
      const raw = {
        id: "10001",
        key: "PROJ-123",
        self: "https://example.atlassian.net/rest/api/3/issue/10001",
        fields: {
          summary: "Test issue",
          status: {
            id: "1",
            name: "In Progress",
            statusCategory: { key: "indeterminate" },
          },
          issuetype: {
            id: "1",
            name: "Story",
          },
          project: {
            id: "10000",
            key: "PROJ",
            name: "My Project",
          },
          created: "2024-01-01T00:00:00.000Z",
          updated: "2024-01-02T00:00:00.000Z",
          customfield_10016: 5,
          customfield_10020: [
            {
              id: 1,
              name: "Sprint 1",
              state: "active",
              startDate: "2024-01-01T00:00:00.000Z",
            },
          ],
        },
      };

      const result = mapIssue(raw);

      expect(result.storyPoints).toBe(5);
      expect(result.sprint).toBeDefined();
      expect(result.sprint?.id).toBe(1);
      expect(result.sprint?.name).toBe("Sprint 1");
      expect(result.sprints).toHaveLength(1);
    });

    it("should handle issue without sprint or storyPoints", () => {
      const raw = {
        id: "10001",
        key: "PROJ-456",
        self: "https://example.atlassian.net/rest/api/3/issue/10001",
        fields: {
          summary: "Simple task",
          status: {
            id: "1",
            name: "Open",
          },
          issuetype: {
            id: "2",
            name: "Task",
          },
          project: {
            id: "10000",
            key: "PROJ",
            name: "My Project",
          },
          created: "2024-01-01T00:00:00.000Z",
          updated: "2024-01-02T00:00:00.000Z",
        },
      };

      const result = mapIssue(raw);

      expect(result.storyPoints).toBeUndefined();
      expect(result.sprint).toBeUndefined();
      expect(result.sprints).toBeUndefined();
    });
  });

  describe("field candidate constants", () => {
    it("should have story points field candidates", () => {
      expect(STORY_POINTS_FIELD_CANDIDATES).toContain("customfield_10016");
      expect(STORY_POINTS_FIELD_CANDIDATES.length).toBeGreaterThan(0);
    });

    it("should have sprint field candidates", () => {
      expect(SPRINT_FIELD_CANDIDATES).toContain("customfield_10020");
      expect(SPRINT_FIELD_CANDIDATES.length).toBeGreaterThan(0);
    });
  });
});
