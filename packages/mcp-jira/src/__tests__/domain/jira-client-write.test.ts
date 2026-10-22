/**
 * Tests for JiraClient write operations against mocked HTTP responses.
 *
 * Jira answers successful write calls (PUT /issue, POST /transitions,
 * POST /sprint/{id}/issue) with 204 No Content, so the client must not
 * try to parse an empty body as JSON.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  JiraClient,
  JiraApiError,
  extractJiraErrorDetail,
} from "../../domain/jira-client.js";
import type { JiraConfig } from "../../config/schema.js";

const config: JiraConfig = {
  baseUrl: "https://example.atlassian.net",
  auth: { type: "basic", email: "test@example.com", apiToken: "fake-token" },
  timeout: 1000,
  maxRetries: 0,
};

function noContent(): Response {
  return new Response(null, { status: 204 });
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("JiraClient write operations", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("updateIssue", () => {
    it("should succeed when Jira returns 204 No Content", async () => {
      fetchMock.mockResolvedValueOnce(noContent());
      const client = new JiraClient(config);

      const result = await client.updateIssue({
        issueKey: "PROJ-1",
        summary: "New summary",
      });

      expect(result).toEqual({ success: true, issueKey: "PROJ-1" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://example.atlassian.net/rest/api/3/issue/PROJ-1");
      expect(init.method).toBe("PUT");
      expect(JSON.parse(init.body as string)).toEqual({
        fields: { summary: "New summary" },
      });
    });

    it("should not retry a successful 204 response", async () => {
      fetchMock.mockResolvedValue(noContent());
      const client = new JiraClient({ ...config, maxRetries: 3 });

      await client.updateIssue({ issueKey: "PROJ-1", labels: ["a"] });

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("should surface Jira field errors on 400", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(400, {
          errorMessages: [],
          errors: {
            customfield_10016:
              "Field 'customfield_10016' cannot be set. It is not on the appropriate screen, or unknown.",
          },
        })
      );
      const client = new JiraClient(config);

      const error = await client
        .updateIssue({ issueKey: "PROJ-1", storyPoints: 3 })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(JiraApiError);
      expect((error as JiraApiError).statusCode).toBe(400);
      expect((error as JiraApiError).message).toContain("customfield_10016");
      expect((error as JiraApiError).message).toContain("not on the appropriate screen");
    });
  });

  describe("moveIssuesToSprint", () => {
    it("should succeed when Jira returns 204 No Content", async () => {
      fetchMock.mockResolvedValueOnce(noContent());
      const client = new JiraClient(config);

      await expect(
        client.moveIssuesToSprint({ sprintId: 7, issueKeys: ["PROJ-1"] })
      ).resolves.toEqual({ success: true, sprintId: 7, movedIssues: ["PROJ-1"] });
    });
  });

  describe("response parsing", () => {
    it("should not retry when a successful response has invalid JSON", async () => {
      fetchMock.mockResolvedValue(new Response("not json", { status: 200 }));
      const client = new JiraClient({ ...config, maxRetries: 3 });

      const error = await client
        .updateIssue({ issueKey: "PROJ-1", summary: "x" })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(JiraApiError);
      expect((error as JiraApiError).message).toBe("Invalid JSON in Jira response");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});

describe("extractJiraErrorDetail", () => {
  it("should combine errorMessages and field errors", () => {
    const detail = extractJiraErrorDetail(
      JSON.stringify({
        errorMessages: ["Issue is locked"],
        errors: { priority: "Priority name 'Urgent' is not valid" },
      })
    );
    expect(detail).toBe("Issue is locked; priority: Priority name 'Urgent' is not valid");
  });

  it("should return undefined for empty or non-JSON bodies", () => {
    expect(extractJiraErrorDetail("")).toBeUndefined();
    expect(extractJiraErrorDetail("<html>Bad Request</html>")).toBeUndefined();
    expect(extractJiraErrorDetail(JSON.stringify({ errors: {} }))).toBeUndefined();
  });

  it("should truncate very long details", () => {
    const detail = extractJiraErrorDetail(
      JSON.stringify({ errorMessages: ["x".repeat(1000)] })
    );
    expect(detail).toHaveLength(503);
    expect(detail?.endsWith("...")).toBe(true);
  });
});
