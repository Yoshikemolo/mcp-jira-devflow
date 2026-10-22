/**
 * Tests for rich text (Markdown / ADF / plain text) conversion.
 */

import { describe, it, expect } from "vitest";
import {
  markdownToAdf,
  parseAdf,
  toAdf,
  RichTextError,
  type AdfNode,
} from "../../domain/rich-text.js";

function blocks(markdown: string): AdfNode[] {
  return markdownToAdf(markdown).content;
}

describe("markdownToAdf", () => {
  it("should convert plain paragraphs and keep single newlines as hard breaks", () => {
    expect(blocks("line one\nline two\n\nsecond paragraph")).toEqual([
      {
        type: "paragraph",
        content: [
          { type: "text", text: "line one" },
          { type: "hardBreak" },
          { type: "text", text: "line two" },
        ],
      },
      { type: "paragraph", content: [{ type: "text", text: "second paragraph" }] },
    ]);
  });

  it("should return an empty paragraph for empty input", () => {
    expect(markdownToAdf("")).toEqual({
      type: "doc",
      version: 1,
      content: [{ type: "paragraph", content: [] }],
    });
  });

  it("should convert headings with their level", () => {
    expect(blocks("## Context")).toEqual([
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Context" }] },
    ]);
  });

  it("should convert inline marks", () => {
    const [p] = blocks("**bold** *em* ~~gone~~ `code` ***both***");
    expect(p?.content).toEqual([
      { type: "text", text: "bold", marks: [{ type: "strong" }] },
      { type: "text", text: " " },
      { type: "text", text: "em", marks: [{ type: "em" }] },
      { type: "text", text: " " },
      { type: "text", text: "gone", marks: [{ type: "strike" }] },
      { type: "text", text: " " },
      { type: "text", text: "code", marks: [{ type: "code" }] },
      { type: "text", text: " " },
      { type: "text", text: "both", marks: [{ type: "em" }, { type: "strong" }] },
    ]);
  });

  it("should only combine the code mark with links", () => {
    const [p] = blocks("**`x`** [`y`](https://example.com)");
    expect(p?.content).toEqual([
      { type: "text", text: "x", marks: [{ type: "code" }] },
      { type: "text", text: " " },
      {
        type: "text",
        text: "y",
        marks: [{ type: "link", attrs: { href: "https://example.com" } }, { type: "code" }],
      },
    ]);
  });

  it("should convert safe links and drop unsafe link schemes", () => {
    const [p] = blocks("[ok](https://example.com) [bad](javascript:alert(1))");
    expect(p?.content).toEqual([
      { type: "text", text: "ok", marks: [{ type: "link", attrs: { href: "https://example.com" } }] },
      { type: "text", text: " " },
      { type: "text", text: "bad" },
    ]);
  });

  it("should render images as links", () => {
    const [p] = blocks("![diagram](https://example.com/d.png)");
    expect(p?.content).toEqual([
      {
        type: "text",
        text: "diagram",
        marks: [{ type: "link", attrs: { href: "https://example.com/d.png" } }],
      },
    ]);
  });

  it("should keep raw HTML as literal text", () => {
    const [p] = blocks("a <b>b</b>");
    expect(p?.content).toEqual([
      { type: "text", text: "a " },
      { type: "text", text: "<b>" },
      { type: "text", text: "b" },
      { type: "text", text: "</b>" },
    ]);
  });

  it("should convert bullet lists with nested lists", () => {
    expect(blocks("- one\n  - nested\n- two")).toEqual([
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "one" }] },
              {
                type: "bulletList",
                content: [
                  {
                    type: "listItem",
                    content: [{ type: "paragraph", content: [{ type: "text", text: "nested" }] }],
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: "two" }] }],
          },
        ],
      },
    ]);
  });

  it("should convert ordered lists and keep a custom start", () => {
    const [first, second] = blocks("1. a\n\ntext\n\n3. c");
    expect(first).toMatchObject({ type: "orderedList" });
    expect(first).not.toHaveProperty("attrs");
    expect(second).toMatchObject({ type: "paragraph" });
    expect(blocks("3. c")[0]).toMatchObject({ type: "orderedList", attrs: { order: 3 } });
  });

  it("should convert task lists", () => {
    expect(blocks("- [x] done\n- [ ] todo")).toEqual([
      {
        type: "taskList",
        attrs: { localId: "" },
        content: [
          {
            type: "taskItem",
            attrs: { localId: "1", state: "DONE" },
            content: [{ type: "text", text: "done" }],
          },
          {
            type: "taskItem",
            attrs: { localId: "2", state: "TODO" },
            content: [{ type: "text", text: "todo" }],
          },
        ],
      },
    ]);
  });

  it("should fall back to a bullet list when tasks are mixed with plain items", () => {
    const [list] = blocks("- [x] done\n- plain");
    expect(list?.type).toBe("bulletList");
    expect(list?.content?.[0]?.content?.[0]?.content?.[0]).toEqual({ type: "text", text: "[x] " });
  });

  it("should convert fenced code blocks with language", () => {
    expect(blocks("```ts\nconst a = 1;\n```")).toEqual([
      {
        type: "codeBlock",
        attrs: { language: "ts" },
        content: [{ type: "text", text: "const a = 1;" }],
      },
    ]);
  });

  it("should convert blockquotes, flattening disallowed blocks", () => {
    expect(blocks("> # Title\n> quoted")).toEqual([
      {
        type: "blockquote",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Title" }] },
          { type: "paragraph", content: [{ type: "text", text: "quoted" }] },
        ],
      },
    ]);
  });

  it("should convert horizontal rules", () => {
    expect(blocks("a\n\n---\n\nb")[1]).toEqual({ type: "rule" });
  });

  it("should convert tables", () => {
    expect(blocks("| A | B |\n|---|---|\n| 1 | **2** |")).toEqual([
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }] },
              { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "B" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "1" }] }] },
              {
                type: "tableCell",
                content: [
                  { type: "paragraph", content: [{ type: "text", text: "2", marks: [{ type: "strong" }] }] },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });
});

describe("parseAdf", () => {
  const doc = {
    type: "doc",
    version: 1,
    content: [{ type: "paragraph", content: [{ type: "text", text: "hi" }] }],
  };

  it("should accept a valid ADF object", () => {
    expect(parseAdf(doc)).toEqual(doc);
  });

  it("should accept ADF as a JSON string", () => {
    expect(parseAdf(JSON.stringify(doc))).toEqual(doc);
  });

  it("should reject invalid JSON strings", () => {
    expect(() => parseAdf("{not json")).toThrow(RichTextError);
  });

  it("should reject documents with the wrong root", () => {
    expect(() => parseAdf({ type: "paragraph", version: 1, content: [] })).toThrow(
      /Invalid ADF document at type/
    );
  });

  it("should reject unknown properties and empty text nodes", () => {
    expect(() => parseAdf({ ...doc, extra: true })).toThrow(RichTextError);
    expect(() =>
      parseAdf({ type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }] })
    ).toThrow(/non-empty/);
  });

  it("should reject documents nested too deeply", () => {
    let node: Record<string, unknown> = { type: "paragraph", content: [] };
    for (let i = 0; i < 40; i++) node = { type: "blockquote", content: [node] };
    expect(() => parseAdf({ type: "doc", version: 1, content: [node] })).toThrow(/nesting depth/);
  });
});

describe("toAdf", () => {
  it("should convert markdown", () => {
    expect(toAdf("**x**", "markdown").content[0]?.content?.[0]).toEqual({
      type: "text",
      text: "x",
      marks: [{ type: "strong" }],
    });
  });

  it("should keep plain text literal", () => {
    expect(toAdf("**x**", "text").content[0]?.content?.[0]).toEqual({ type: "text", text: "**x**" });
  });

  it("should reject objects for string formats", () => {
    expect(() => toAdf({ type: "doc" }, "markdown")).toThrow(/expects a string/);
  });
});
