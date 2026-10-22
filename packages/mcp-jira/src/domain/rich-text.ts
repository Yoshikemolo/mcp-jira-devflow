/**
 * Rich Text Conversion
 *
 * Converts rich text input (Markdown, Atlassian Document Format or plain text)
 * into an ADF document accepted by the Jira Cloud REST API v3.
 */

import { Lexer, type Token, type Tokens } from "marked";
import { z } from "zod";
import { textToAdf } from "./mappers.js";

/**
 * Supported input formats for rich text fields.
 */
export const RICH_TEXT_FORMATS = ["markdown", "adf", "text"] as const;

export type RichTextFormat = (typeof RICH_TEXT_FORMATS)[number];

/**
 * Default format applied when the caller does not specify one.
 */
export const DEFAULT_RICH_TEXT_FORMAT: RichTextFormat = "markdown";

/**
 * Zod schema for a rich text format parameter.
 */
export const RichTextFormatSchema = z
  .enum(RICH_TEXT_FORMATS)
  .default(DEFAULT_RICH_TEXT_FORMAT);

/**
 * ADF mark (e.g., strong, em, link).
 */
export interface AdfMark {
  type: string;
  attrs?: Record<string, unknown> | undefined;
}

/**
 * ADF node.
 */
export interface AdfNode {
  type: string;
  attrs?: Record<string, unknown> | undefined;
  content?: AdfNode[] | undefined;
  text?: string | undefined;
  marks?: AdfMark[] | undefined;
}

/**
 * ADF root document.
 */
export interface AdfDocument {
  type: "doc";
  version: 1;
  content: AdfNode[];
}

/**
 * Maximum nesting depth accepted for ADF input.
 */
const MAX_ADF_DEPTH = 32;

const AdfMarkSchema = z
  .object({
    type: z.string().min(1),
    attrs: z.record(z.unknown()).optional(),
  })
  .strict();

const AdfNodeSchema: z.ZodType<AdfNode> = z.lazy(() =>
  z
    .object({
      type: z.string().min(1),
      attrs: z.record(z.unknown()).optional(),
      content: z.array(AdfNodeSchema).optional(),
      text: z.string().optional(),
      marks: z.array(AdfMarkSchema).optional(),
    })
    .strict()
    .refine((node) => node.type !== "text" || (node.text ?? "") !== "", {
      message: "Text nodes must have a non-empty 'text' value",
    })
);

/**
 * Zod schema for an ADF document.
 */
export const AdfDocumentSchema: z.ZodType<AdfDocument> = z
  .object({
    type: z.literal("doc"),
    version: z.literal(1),
    content: z.array(AdfNodeSchema),
  })
  .strict();

/**
 * Error raised when rich text input cannot be converted.
 */
export class RichTextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RichTextError";
  }
}

// ============================================================================
// Markdown -> ADF
// ============================================================================

/**
 * URL schemes allowed in links. Anything else is rendered as plain text.
 */
const SAFE_LINK_PATTERN = /^(https?:|mailto:|\/|#)/i;

/**
 * Block node types allowed inside list items and blockquotes.
 */
const NESTABLE_BLOCK_TYPES = new Set([
  "paragraph",
  "bulletList",
  "orderedList",
  "codeBlock",
]);

function textNode(text: string, marks: AdfMark[]): AdfNode[] {
  if (text === "") return [];
  // The code mark may only be combined with the link mark
  const hasCode = marks.some((m) => m.type === "code");
  const allowed = hasCode
    ? marks.filter((m) => m.type === "code" || m.type === "link")
    : marks;
  return allowed.length > 0
    ? [{ type: "text", text, marks: allowed }]
    : [{ type: "text", text }];
}

/**
 * Splits text on newlines into text nodes separated by hard breaks.
 */
function textWithBreaks(text: string, marks: AdfMark[]): AdfNode[] {
  const nodes: AdfNode[] = [];
  text.split("\n").forEach((line, index) => {
    if (index > 0) nodes.push({ type: "hardBreak" });
    nodes.push(...textNode(line, marks));
  });
  return nodes;
}

function addMark(marks: AdfMark[], mark: AdfMark): AdfMark[] {
  return marks.some((m) => m.type === mark.type) ? marks : [...marks, mark];
}

function convertInline(tokens: Token[] | undefined, marks: AdfMark[]): AdfNode[] {
  const nodes: AdfNode[] = [];

  for (const token of tokens ?? []) {
    switch (token.type) {
      case "text": {
        const t = token as Tokens.Text;
        nodes.push(
          ...(t.tokens ? convertInline(t.tokens, marks) : textWithBreaks(t.text, marks))
        );
        break;
      }
      case "escape":
        nodes.push(...textNode((token as Tokens.Escape).text, marks));
        break;
      case "strong":
        nodes.push(
          ...convertInline((token as Tokens.Strong).tokens, addMark(marks, { type: "strong" }))
        );
        break;
      case "em":
        nodes.push(
          ...convertInline((token as Tokens.Em).tokens, addMark(marks, { type: "em" }))
        );
        break;
      case "del":
        nodes.push(
          ...convertInline((token as Tokens.Del).tokens, addMark(marks, { type: "strike" }))
        );
        break;
      case "codespan":
        nodes.push(...textNode((token as Tokens.Codespan).text, addMark(marks, { type: "code" })));
        break;
      case "br":
        nodes.push({ type: "hardBreak" });
        break;
      case "link": {
        const t = token as Tokens.Link;
        if (SAFE_LINK_PATTERN.test(t.href)) {
          nodes.push(
            ...convertInline(t.tokens, addMark(marks, { type: "link", attrs: { href: t.href } }))
          );
        } else {
          nodes.push(...convertInline(t.tokens, marks));
        }
        break;
      }
      case "image": {
        // Images require Jira media uploads; render them as links instead
        const t = token as Tokens.Image;
        const label = t.text || t.href;
        nodes.push(
          ...(SAFE_LINK_PATTERN.test(t.href)
            ? textNode(label, addMark(marks, { type: "link", attrs: { href: t.href } }))
            : textNode(label, marks))
        );
        break;
      }
      default:
        // Inline HTML and unknown tokens are kept as literal text
        nodes.push(...textWithBreaks(token.raw, marks));
    }
  }

  return nodes;
}

function paragraph(content: AdfNode[]): AdfNode {
  return { type: "paragraph", content };
}

/**
 * Forces a block into a node type allowed inside list items and blockquotes.
 */
function toNestable(node: AdfNode): AdfNode[] {
  if (NESTABLE_BLOCK_TYPES.has(node.type)) return [node];
  if (node.type === "heading") return [paragraph(node.content ?? [])];
  if (node.type === "blockquote") return (node.content ?? []).flatMap(toNestable);
  if (node.type === "rule") return [];
  return [paragraph([{ type: "text", text: collectText(node) || " " }])];
}

function collectText(node: AdfNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  const parts = (node.content ?? []).map(collectText);
  return node.type === "tableRow" ? parts.join(" | ") : parts.join(node.type === "table" ? "\n" : "");
}

function isPlainTaskItem(item: Tokens.ListItem): boolean {
  return (
    item.task &&
    item.tokens.every((t) => t.type === "checkbox" || t.type === "text" || t.type === "paragraph")
  );
}

function convertList(list: Tokens.List): AdfNode {
  if (list.items.length > 0 && list.items.every(isPlainTaskItem)) {
    return {
      type: "taskList",
      attrs: { localId: "" },
      content: list.items.map((item, index) => ({
        type: "taskItem",
        attrs: { localId: String(index + 1), state: item.checked ? "DONE" : "TODO" },
        content: item.tokens
          .filter((t) => t.type !== "checkbox")
          .flatMap((t) => convertInline("tokens" in t && t.tokens ? t.tokens : [t], [])),
      })),
    };
  }

  const items: AdfNode[] = list.items.map((item) => {
    const blocks = convertBlocks(item.tokens.filter((t) => t.type !== "checkbox")).flatMap(
      toNestable
    );
    if (item.task) {
      const marker: AdfNode = { type: "text", text: item.checked ? "[x] " : "[ ] " };
      const first = blocks[0];
      if (first?.type === "paragraph") {
        first.content = [marker, ...(first.content ?? [])];
      } else {
        blocks.unshift(paragraph([marker]));
      }
    }
    return { type: "listItem", content: blocks.length > 0 ? blocks : [paragraph([])] };
  });

  if (list.ordered) {
    const start = typeof list.start === "number" ? list.start : 1;
    return {
      type: "orderedList",
      ...(start !== 1 ? { attrs: { order: start } } : {}),
      content: items,
    };
  }

  return { type: "bulletList", content: items };
}

function convertTable(table: Tokens.Table): AdfNode {
  const cell = (type: string, c: Tokens.TableCell): AdfNode => ({
    type,
    content: [paragraph(convertInline(c.tokens, []))],
  });

  return {
    type: "table",
    content: [
      { type: "tableRow", content: table.header.map((c) => cell("tableHeader", c)) },
      ...table.rows.map((row) => ({
        type: "tableRow",
        content: row.map((c) => cell("tableCell", c)),
      })),
    ],
  };
}

function convertBlocks(tokens: Token[]): AdfNode[] {
  const nodes: AdfNode[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "space":
      case "def":
        break;
      case "heading": {
        const t = token as Tokens.Heading;
        nodes.push({
          type: "heading",
          attrs: { level: Math.min(Math.max(t.depth, 1), 6) },
          content: convertInline(t.tokens, []),
        });
        break;
      }
      case "paragraph":
        nodes.push(paragraph(convertInline((token as Tokens.Paragraph).tokens, [])));
        break;
      case "text": {
        // Block-level text appears inside tight list items
        const t = token as Tokens.Text;
        nodes.push(
          paragraph(t.tokens ? convertInline(t.tokens, []) : textWithBreaks(t.text, []))
        );
        break;
      }
      case "list":
        nodes.push(convertList(token as Tokens.List));
        break;
      case "blockquote": {
        const content = convertBlocks((token as Tokens.Blockquote).tokens).flatMap(toNestable);
        nodes.push({ type: "blockquote", content: content.length > 0 ? content : [paragraph([])] });
        break;
      }
      case "code": {
        const t = token as Tokens.Code;
        nodes.push({
          type: "codeBlock",
          ...(t.lang ? { attrs: { language: t.lang.split(/\s+/)[0] } } : {}),
          content: t.text ? [{ type: "text", text: t.text }] : [],
        });
        break;
      }
      case "hr":
        nodes.push({ type: "rule" });
        break;
      case "table":
        nodes.push(convertTable(token as Tokens.Table));
        break;
      default:
        // Block HTML and unknown tokens are kept as literal text
        if (token.raw.trim()) {
          nodes.push(paragraph(textWithBreaks(token.raw.trim(), [])));
        }
    }
  }

  return nodes;
}

/**
 * Converts GitHub-flavored Markdown to an ADF document.
 *
 * Single newlines become hard breaks, matching how plain text was handled
 * before Markdown support. Raw HTML is kept as literal text, images become
 * links, and links with unsafe schemes are rendered as plain text.
 */
export function markdownToAdf(markdown: string): AdfDocument {
  const tokens = new Lexer({ gfm: true, breaks: true }).lex(markdown);
  const content = convertBlocks(tokens);
  return {
    type: "doc",
    version: 1,
    content: content.length > 0 ? content : [paragraph([])],
  };
}

// ============================================================================
// Input normalization
// ============================================================================

function depthOf(node: AdfNode, depth = 1): number {
  if (depth > MAX_ADF_DEPTH) return depth;
  return Math.max(depth, ...(node.content ?? []).map((c) => depthOf(c, depth + 1)));
}

/**
 * Parses and validates ADF input given as an object or a JSON string.
 */
export function parseAdf(value: unknown): AdfDocument {
  let candidate = value;
  if (typeof value === "string") {
    try {
      candidate = JSON.parse(value);
    } catch {
      throw new RichTextError("ADF input must be a JSON object or a valid JSON string");
    }
  }

  const result = AdfDocumentSchema.safeParse(candidate);
  if (!result.success) {
    const issue = result.error.errors[0];
    const path = issue?.path.length ? issue.path.join(".") : "(root)";
    throw new RichTextError(`Invalid ADF document at ${path}: ${issue?.message ?? "invalid"}`);
  }

  const tooDeep = result.data.content.some((n) => depthOf(n) > MAX_ADF_DEPTH);
  if (tooDeep) {
    throw new RichTextError(`ADF document exceeds maximum nesting depth of ${MAX_ADF_DEPTH}`);
  }

  return result.data;
}

/**
 * Converts rich text input to an ADF document according to its format.
 *
 * @throws RichTextError if the input does not match the format
 */
export function toAdf(value: unknown, format: RichTextFormat): AdfDocument {
  if (format === "adf") return parseAdf(value);

  if (typeof value !== "string") {
    throw new RichTextError(
      `Format '${format}' expects a string. Use format 'adf' to pass an ADF object.`
    );
  }

  return format === "markdown" ? markdownToAdf(value) : (textToAdf(value) as AdfDocument);
}
