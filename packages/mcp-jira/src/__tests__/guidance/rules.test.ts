/**
 * Tests for SCRUM guidance rules.
 */

import { describe, it, expect } from "vitest";
import {
  hasAcceptanceCriteria,
  hasUserStoryFormat,
  hasReproductionSteps,
  hasEnvironmentInfo,
  hasExpectedBehavior,
  isStale,
  calculateHealthScore,
  calculateCompletenessScore,
} from "../../guidance/rules.js";
import type { Recommendation, IssueContext } from "../../guidance/types.js";

describe("rules", () => {
  describe("hasAcceptanceCriteria", () => {
    it("should detect Given/When/Then format", () => {
      const description = "Given a user is logged in When they click logout Then they should be redirected";
      expect(hasAcceptanceCriteria(description)).toBe(true);
    });

    it("should detect 'acceptance criteria' text", () => {
      const description = "Acceptance Criteria:\n- User can login\n- User can logout";
      expect(hasAcceptanceCriteria(description)).toBe(true);
    });

    it("should detect AC: prefix", () => {
      const description = "AC: User should see a success message";
      expect(hasAcceptanceCriteria(description)).toBe(true);
    });

    it("should detect checkbox format", () => {
      const description = "[ ] First requirement\n[ ] Second requirement";
      expect(hasAcceptanceCriteria(description)).toBe(true);
    });

    it("should detect bullet list", () => {
      const description = "* First item\n* Second item";
      expect(hasAcceptanceCriteria(description)).toBe(true);
    });

    it("should return false for empty description", () => {
      expect(hasAcceptanceCriteria(undefined)).toBe(false);
      expect(hasAcceptanceCriteria("")).toBe(false);
    });

    it("should return false for description without AC patterns", () => {
      expect(hasAcceptanceCriteria("This is just a plain description")).toBe(false);
    });
  });

  describe("hasUserStoryFormat", () => {
    it("should detect user story format in summary", () => {
      const summary = "As a user, I want to login so that I can access my account";
      expect(hasUserStoryFormat(summary, undefined)).toBe(true);
    });

    it("should detect user story format in description", () => {
      const summary = "Login feature";
      const description = "As a user I want to be able to login to access protected features";
      expect(hasUserStoryFormat(summary, description)).toBe(true);
    });

    it("should return false for non-story format", () => {
      expect(hasUserStoryFormat("Add login button", "Implement login functionality")).toBe(false);
    });
  });

  describe("hasReproductionSteps", () => {
    it("should detect steps to reproduce", () => {
      expect(hasReproductionSteps("Steps to reproduce:\n1. Open app\n2. Click button")).toBe(true);
    });

    it("should detect reproduction steps", () => {
      expect(hasReproductionSteps("Reproduction steps:\n1. Login")).toBe(true);
    });

    it("should detect repro: prefix", () => {
      expect(hasReproductionSteps("Repro: Login and click submit")).toBe(true);
    });

    it("should detect numbered steps", () => {
      expect(hasReproductionSteps("1. First step\n2. Second step")).toBe(true);
    });

    it("should return false for missing steps", () => {
      expect(hasReproductionSteps(undefined)).toBe(false);
      expect(hasReproductionSteps("Bug happens randomly")).toBe(false);
    });
  });

  describe("hasEnvironmentInfo", () => {
    it("should detect environment: prefix", () => {
      expect(hasEnvironmentInfo("Environment: Production")).toBe(true);
    });

    it("should detect browser info", () => {
      expect(hasEnvironmentInfo("Browser: Chrome 120")).toBe(true);
    });

    it("should detect OS info", () => {
      expect(hasEnvironmentInfo("OS: Windows 11")).toBe(true);
    });

    it("should return false for missing environment", () => {
      expect(hasEnvironmentInfo(undefined)).toBe(false);
      expect(hasEnvironmentInfo("Something is broken")).toBe(false);
    });
  });

  describe("hasExpectedBehavior", () => {
    it("should detect expected keyword", () => {
      expect(hasExpectedBehavior("Expected: Button should be blue")).toBe(true);
    });

    it("should detect actual keyword", () => {
      expect(hasExpectedBehavior("Actual: Button is red")).toBe(true);
    });

    it("should detect should/but pattern", () => {
      expect(hasExpectedBehavior("It should work but it crashes")).toBe(true);
    });

    it("should return false for missing expected behavior", () => {
      expect(hasExpectedBehavior(undefined)).toBe(false);
      expect(hasExpectedBehavior("Something is wrong")).toBe(false);
    });
  });

  describe("isStale", () => {
    it("should return true for old updates", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 5);
      expect(isStale(oldDate, 3)).toBe(true);
    });

    it("should return false for recent updates", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 1);
      expect(isStale(recentDate, 3)).toBe(false);
    });

    it("should use default threshold", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 5);
      expect(isStale(oldDate)).toBe(true);
    });
  });

  describe("calculateHealthScore", () => {
    it("should return 100 for no recommendations", () => {
      expect(calculateHealthScore([])).toBe(100);
    });

    it("should deduct 25 for critical", () => {
      const recommendations: Recommendation[] = [
        {
          id: "1",
          severity: "critical",
          category: "completeness",
          title: "Test",
          description: "Test",
          suggestedAction: "Test",
        },
      ];
      expect(calculateHealthScore(recommendations)).toBe(75);
    });

    it("should deduct 15 for high", () => {
      const recommendations: Recommendation[] = [
        {
          id: "1",
          severity: "high",
          category: "completeness",
          title: "Test",
          description: "Test",
          suggestedAction: "Test",
        },
      ];
      expect(calculateHealthScore(recommendations)).toBe(85);
    });

    it("should not go below 0", () => {
      const recommendations: Recommendation[] = [
        { id: "1", severity: "critical", category: "completeness", title: "T", description: "T", suggestedAction: "T" },
        { id: "2", severity: "critical", category: "completeness", title: "T", description: "T", suggestedAction: "T" },
        { id: "3", severity: "critical", category: "completeness", title: "T", description: "T", suggestedAction: "T" },
        { id: "4", severity: "critical", category: "completeness", title: "T", description: "T", suggestedAction: "T" },
        { id: "5", severity: "critical", category: "completeness", title: "T", description: "T", suggestedAction: "T" },
      ];
      expect(calculateHealthScore(recommendations)).toBe(0);
    });
  });

  describe("calculateCompletenessScore", () => {
    it("should return high score for complete issue", () => {
      const context: IssueContext = {
        key: "TEST-1",
        summary: "Test",
        description: { hasField: true, fieldValue: "Test description", isEmpty: false },
        issueType: "Task",
        statusCategory: "new",
        statusName: "New",
        priority: "High",
        assignee: "John Doe",
        labels: ["test"],
        components: [],
        created: new Date(),
        updated: new Date(),
      };
      const score = calculateCompletenessScore(context);
      expect(score).toBeGreaterThan(70);
    });

    it("should return lower score for incomplete issue", () => {
      const context: IssueContext = {
        key: "TEST-1",
        summary: "Test",
        description: { hasField: true, fieldValue: undefined, isEmpty: true },
        issueType: "Story",
        statusCategory: "new",
        statusName: "New",
        priority: undefined,
        assignee: undefined,
        labels: [],
        components: [],
        created: new Date(),
        updated: new Date(),
      };
      const score = calculateCompletenessScore(context);
      expect(score).toBeLessThan(50);
    });

    it("should weight assignee higher for in-progress issues", () => {
      const baseContext: IssueContext = {
        key: "TEST-1",
        summary: "Test",
        description: { hasField: true, fieldValue: "Test", isEmpty: false },
        issueType: "Task",
        statusName: "In Progress",
        priority: "High",
        labels: ["test"],
        components: [],
        created: new Date(),
        updated: new Date(),
        statusCategory: "indeterminate",
        assignee: undefined,
      };

      const withAssignee = { ...baseContext, assignee: "John" };
      const withoutAssignee = { ...baseContext, assignee: undefined };

      const scoreWith = calculateCompletenessScore(withAssignee);
      const scoreWithout = calculateCompletenessScore(withoutAssignee);

      expect(scoreWith).toBeGreaterThan(scoreWithout);
    });
  });
});
