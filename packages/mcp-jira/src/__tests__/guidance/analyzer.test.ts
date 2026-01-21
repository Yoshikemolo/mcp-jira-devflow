/**
 * Tests for SCRUM guidance analyzer.
 */

import { describe, it, expect } from "vitest";
import { analyzeIssue } from "../../guidance/analyzer.js";
import type { JiraIssue } from "../../domain/types.js";

const createMockIssue = (overrides: Partial<JiraIssue> = {}): JiraIssue => ({
  id: "10001",
  key: "PROJ-123",
  self: "https://example.atlassian.net/rest/api/3/issue/10001",
  summary: "Test issue",
  description: "Test description",
  status: { id: "1", name: "Open", categoryKey: "new" },
  issueType: { id: "1", name: "Story", subtask: false },
  project: { id: "10000", key: "PROJ", name: "Project", projectTypeKey: "software" },
  created: "2024-01-01T00:00:00.000Z",
  updated: "2024-01-02T00:00:00.000Z",
  labels: [],
  components: [],
  ...overrides,
});

describe("analyzeIssue", () => {
  describe("summary generation", () => {
    it("should include issue key in summary", () => {
      const issue = createMockIssue();
      const result = analyzeIssue(issue, { level: "standard" });

      expect(result.summary.issueKey).toBe("PROJ-123");
    });

    it("should include issue type in summary", () => {
      const issue = createMockIssue();
      const result = analyzeIssue(issue, { level: "standard" });

      expect(result.summary.issueType).toBe("Story");
    });

    it("should include status category in summary", () => {
      const issue = createMockIssue();
      const result = analyzeIssue(issue, { level: "standard" });

      expect(result.summary.statusCategory).toBe("new");
    });

    it("should calculate health score", () => {
      const issue = createMockIssue();
      const result = analyzeIssue(issue, { level: "standard" });

      expect(result.summary.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.summary.healthScore).toBeLessThanOrEqual(100);
    });

    it("should calculate completeness score", () => {
      const issue = createMockIssue();
      const result = analyzeIssue(issue, { level: "standard" });

      expect(result.summary.completenessScore).toBeGreaterThanOrEqual(0);
      expect(result.summary.completenessScore).toBeLessThanOrEqual(100);
    });
  });

  describe("Story analysis", () => {
    it("should recommend acceptance criteria for stories without them", () => {
      const issue = createMockIssue({
        issueType: { id: "1", name: "Story", subtask: false },
        description: "A simple description without AC",
      });

      const result = analyzeIssue(issue, { level: "standard" });

      const acRecommendation = result.recommendations.find(
        (r) => r.title.toLowerCase().includes("acceptance criteria")
      );
      expect(acRecommendation).toBeDefined();
      expect(acRecommendation?.severity).toBe("critical");
    });

    it("should not recommend AC for stories with Given/When/Then", () => {
      const issue = createMockIssue({
        issueType: { id: "1", name: "Story", subtask: false },
        description: "Given a user When they click Then something happens",
      });

      const result = analyzeIssue(issue, { level: "standard" });

      const acRecommendation = result.recommendations.find(
        (r) => r.title.toLowerCase().includes("acceptance criteria")
      );
      expect(acRecommendation).toBeUndefined();
    });

    it("should recommend user story format when not present", () => {
      const issue = createMockIssue({
        issueType: { id: "1", name: "Story", subtask: false },
        summary: "Add login button",
        description: "We need a login button",
      });

      const result = analyzeIssue(issue, { level: "verbose" });

      const formatRecommendation = result.recommendations.find(
        (r) => r.title.toLowerCase().includes("user story format")
      );
      expect(formatRecommendation).toBeDefined();
    });
  });

  describe("Bug analysis", () => {
    it("should recommend reproduction steps for bugs", () => {
      const issue = createMockIssue({
        issueType: { id: "2", name: "Bug", subtask: false },
        description: "The app crashes randomly",
      });

      const result = analyzeIssue(issue, { level: "standard" });

      const reproRecommendation = result.recommendations.find(
        (r) => r.title.toLowerCase().includes("reproduction steps")
      );
      expect(reproRecommendation).toBeDefined();
      expect(reproRecommendation?.severity).toBe("critical");
    });

    it("should not recommend reproduction steps when present", () => {
      const issue = createMockIssue({
        issueType: { id: "2", name: "Bug", subtask: false },
        description: "Steps to reproduce:\n1. Open app\n2. Click button\n3. See error",
      });

      const result = analyzeIssue(issue, { level: "standard" });

      const reproRecommendation = result.recommendations.find(
        (r) => r.title.toLowerCase().includes("reproduction steps")
      );
      expect(reproRecommendation).toBeUndefined();
    });

    it("should recommend environment info for bugs", () => {
      const issue = createMockIssue({
        issueType: { id: "2", name: "Bug", subtask: false },
        description: "Something is broken",
      });

      const result = analyzeIssue(issue, { level: "standard" });

      const envRecommendation = result.recommendations.find(
        (r) => r.title.toLowerCase().includes("environment")
      );
      expect(envRecommendation).toBeDefined();
    });
  });

  describe("workflow actions", () => {
    it("should suggest assignment for new unassigned issues", () => {
      const issue = createMockIssue({
        status: { id: "1", name: "Open", categoryKey: "new" },
        assignee: undefined,
      });

      const result = analyzeIssue(issue, { level: "standard" });

      const assignAction = result.workflowActions.find(
        (a) => a.action.toLowerCase().includes("assign")
      );
      expect(assignAction).toBeDefined();
    });

    it("should suggest refinement for new items", () => {
      const issue = createMockIssue({
        status: { id: "1", name: "Open", categoryKey: "new" },
      });

      const result = analyzeIssue(issue, { level: "verbose" });

      const refineAction = result.workflowActions.find(
        (a) => a.action.toLowerCase().includes("refinement")
      );
      expect(refineAction).toBeDefined();
    });

    it("should suggest update for stale in-progress issues", () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 5);

      const issue = createMockIssue({
        status: { id: "2", name: "In Progress", categoryKey: "indeterminate" },
        updated: staleDate.toISOString(),
      });

      const result = analyzeIssue(issue, { level: "standard" });

      const updateAction = result.workflowActions.find(
        (a) => a.action.toLowerCase().includes("update")
      );
      expect(updateAction).toBeDefined();
    });

    it("should suggest root cause documentation for completed bugs", () => {
      const issue = createMockIssue({
        issueType: { id: "2", name: "Bug", subtask: false },
        status: { id: "3", name: "Done", categoryKey: "done" },
      });

      const result = analyzeIssue(issue, { level: "verbose" });

      const rootCauseAction = result.workflowActions.find(
        (a) => a.action.toLowerCase().includes("root cause")
      );
      expect(rootCauseAction).toBeDefined();
    });
  });

  describe("follow-up prompts", () => {
    it("should generate follow-up prompts", () => {
      const issue = createMockIssue();
      const result = analyzeIssue(issue, { level: "standard" });

      expect(result.followUpPrompts.length).toBeGreaterThan(0);
    });

    it("should include issue key in prompts", () => {
      const issue = createMockIssue({ key: "TEST-456" });
      const result = analyzeIssue(issue, { level: "standard" });

      const hasIssueKey = result.followUpPrompts.some(
        (p) => p.prompt.includes("TEST-456")
      );
      expect(hasIssueKey).toBe(true);
    });

    it("should limit prompts based on detail level", () => {
      const issue = createMockIssue();

      const minimal = analyzeIssue(issue, { level: "minimal" });
      const verbose = analyzeIssue(issue, { level: "verbose" });

      expect(minimal.followUpPrompts.length).toBeLessThanOrEqual(3);
      expect(verbose.followUpPrompts.length).toBeLessThanOrEqual(10);
    });
  });

  describe("detail level filtering", () => {
    it("should filter out low severity in minimal mode", () => {
      const issue = createMockIssue({
        issueType: { id: "1", name: "Story", subtask: false },
        description: "Test description",
        labels: [],
        components: [],
      });

      const minimal = analyzeIssue(issue, { level: "minimal" });

      const lowSeverity = minimal.recommendations.filter(
        (r) => r.severity === "low" || r.severity === "info"
      );
      expect(lowSeverity.length).toBe(0);
    });

    it("should include all recommendations in verbose mode", () => {
      const issue = createMockIssue({
        issueType: { id: "1", name: "Story", subtask: false },
        description: "Test description",
        labels: [],
        components: [],
      });

      const verbose = analyzeIssue(issue, { level: "verbose" });
      const standard = analyzeIssue(issue, { level: "standard" });

      expect(verbose.recommendations.length).toBeGreaterThanOrEqual(standard.recommendations.length);
    });

    it("should filter low priority actions in minimal mode", () => {
      const issue = createMockIssue({
        status: { id: "2", name: "In Progress", categoryKey: "indeterminate" },
      });

      const minimal = analyzeIssue(issue, { level: "minimal" });

      const lowPriority = minimal.workflowActions.filter((a) => a.priority === "low");
      expect(lowPriority.length).toBe(0);
    });
  });
});
