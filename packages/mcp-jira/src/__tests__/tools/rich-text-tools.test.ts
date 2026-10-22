/**
 * Tests for rich text format handling in write tools.
 */

import { describe, it, expect, vi } from "vitest";
import { executeUpdateIssue } from "../../tools/update-issue.js";
import { executeCreateIssue } from "../../tools/create-issue.js";
import { executeTransitionIssue } from "../../tools/transition-issue.js";
import type { JiraClient } from "../../domain/jira-client.js";

const createMockClient = () => ({
  updateIssue: vi.fn().mockResolvedValue({ success: true, issueKey: "PROJ-1" }),
  createIssue: vi.fn().mockResolvedValue({ id: "1", key: "PROJ-1", self: "" }),
  transitionIssue: vi.fn().mockResolvedValue({
    success: true,
    issueKey: "PROJ-1",
    transitionName: "Done",
    newStatus: "Done",
  }),
});

const adfDoc = {
  type: "doc",
  version: 1,
  content: [{ type: "paragraph", content: [{ type: "text", text: "from adf" }] }],
};

describe("update_issue rich text", () => {
  it("should convert description from Markdown by default", async () => {
    const client = createMockClient();
    const result = await executeUpdateIssue(client as unknown as JiraClient, {
      issueKey: "PROJ-1",
      description: "## Title",
    });

    expect(result.isError).toBeUndefined();
    expect(client.updateIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        description: {
          type: "doc",
          version: 1,
          content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Title" }] }],
        },
      })
    );
  });

  it("should pass ADF documents through unchanged", async () => {
    const client = createMockClient();
    await executeUpdateIssue(client as unknown as JiraClient, {
      issueKey: "PROJ-1",
      description: adfDoc,
      descriptionFormat: "adf",
    });

    expect(client.updateIssue).toHaveBeenCalledWith(
      expect.objectContaining({ description: adfDoc })
    );
  });

  it("should keep text format literal", async () => {
    const client = createMockClient();
    await executeUpdateIssue(client as unknown as JiraClient, {
      issueKey: "PROJ-1",
      description: "**not bold**",
      descriptionFormat: "text",
    });

    const call = client.updateIssue.mock.calls[0]?.[0] as { description: typeof adfDoc };
    expect(call.description.content[0]?.content[0]).toEqual({ type: "text", text: "**not bold**" });
  });

  it("should return a validation error for invalid ADF without calling Jira", async () => {
    const client = createMockClient();
    const result = await executeUpdateIssue(client as unknown as JiraClient, {
      issueKey: "PROJ-1",
      description: { type: "paragraph" },
      descriptionFormat: "adf",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/^Validation error: description: Invalid ADF document/);
    expect(client.updateIssue).not.toHaveBeenCalled();
  });

  it("should reject unknown formats", async () => {
    const client = createMockClient();
    const result = await executeUpdateIssue(client as unknown as JiraClient, {
      issueKey: "PROJ-1",
      description: "x",
      descriptionFormat: "html",
    });

    expect(result.isError).toBe(true);
    expect(client.updateIssue).not.toHaveBeenCalled();
  });

  it("should show the generated ADF in dry-run mode", async () => {
    const client = createMockClient();
    const result = await executeUpdateIssue(client as unknown as JiraClient, {
      issueKey: "PROJ-1",
      description: "*hi*",
      dryRun: true,
    });

    const preview = JSON.parse(result.content[0]?.text ?? "{}");
    expect(preview.wouldUpdate.description.format).toBe("markdown");
    expect(preview.wouldUpdate.description.adf.content[0].content[0]).toEqual({
      type: "text",
      text: "hi",
      marks: [{ type: "em" }],
    });
    expect(client.updateIssue).not.toHaveBeenCalled();
  });
});

describe("create_issue rich text", () => {
  it("should convert description from Markdown", async () => {
    const client = createMockClient();
    await executeCreateIssue(client as unknown as JiraClient, {
      projectKey: "PROJ",
      summary: "S",
      issueTypeName: "Task",
      description: "- item",
    });

    expect(client.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.objectContaining({
          content: [expect.objectContaining({ type: "bulletList" })],
        }),
      })
    );
  });

  it("should accept ADF as a JSON string", async () => {
    const client = createMockClient();
    await executeCreateIssue(client as unknown as JiraClient, {
      projectKey: "PROJ",
      summary: "S",
      issueTypeName: "Task",
      description: JSON.stringify(adfDoc),
      descriptionFormat: "adf",
    });

    expect(client.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({ description: adfDoc })
    );
  });
});

describe("transition_issue rich text", () => {
  it("should convert the comment from Markdown", async () => {
    const client = createMockClient();
    await executeTransitionIssue(client as unknown as JiraClient, {
      issueKey: "PROJ-1",
      transitionName: "Done",
      comment: "`fixed`",
    });

    expect(client.transitionIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        comment: {
          type: "doc",
          version: 1,
          content: [
            { type: "paragraph", content: [{ type: "text", text: "fixed", marks: [{ type: "code" }] }] },
          ],
        },
      })
    );
  });

  it("should reject an object comment when the format is markdown", async () => {
    const client = createMockClient();
    const result = await executeTransitionIssue(client as unknown as JiraClient, {
      issueKey: "PROJ-1",
      transitionName: "Done",
      comment: adfDoc,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/comment: Format 'markdown' expects a string/);
    expect(client.transitionIssue).not.toHaveBeenCalled();
  });
});
