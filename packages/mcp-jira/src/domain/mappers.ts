/**
 * API Response Mappers
 *
 * Functions to map Jira REST API responses to domain types.
 * These mappers handle the transformation and ensure type safety.
 */

import type {
  JiraUser,
  JiraProject,
  JiraStatus,
  JiraPriority,
  JiraIssueType,
  JiraIssue,
  JiraIssueCompact,
  JiraComment,
  JiraComponent,
  JiraSearchResult,
  JiraCommentsResult,
  JiraSprint,
  JiraIssueExtended,
  JiraIssueRef,
  JiraIssueLink,
  JiraIssueLinkType,
  JiraTransition,
  JiraTransitionsResult,
} from "./types.js";

/**
 * Raw API response types (partial, for mapping purposes).
 */
interface RawUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls?: Record<string, string>;
  active?: boolean;
}

interface RawStatus {
  id: string;
  name: string;
  description?: string;
  statusCategory?: {
    key: string;
  };
}

interface RawPriority {
  id: string;
  name: string;
  iconUrl?: string;
}

interface RawIssueType {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  subtask?: boolean;
}

interface RawProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey?: string;
  avatarUrls?: Record<string, string>;
}

interface RawComponent {
  id: string;
  name: string;
  description?: string;
}

interface RawComment {
  id: string;
  author: RawUser;
  body: unknown; // Can be string or ADF
  created: string;
  updated: string;
}

interface RawSprint {
  id: number;
  name: string;
  state: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  goal?: string;
}

interface RawIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: unknown;
    status: RawStatus;
    priority?: RawPriority;
    issuetype: RawIssueType;
    project: RawProject;
    assignee?: RawUser;
    reporter?: RawUser;
    created: string;
    updated: string;
    labels?: string[];
    components?: RawComponent[];
    // Custom fields - index signature for dynamic field names
    [key: string]: unknown;
  };
}

/**
 * Raw issue link type from API.
 */
interface RawIssueLinkType {
  id: string;
  name: string;
  inward: string;
  outward: string;
}

/**
 * Raw linked issue reference from API.
 */
interface RawLinkedIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    status: RawStatus;
    issuetype: RawIssueType;
    priority?: RawPriority;
  };
}

/**
 * Raw issue link from API.
 */
interface RawIssueLink {
  id: string;
  type: RawIssueLinkType;
  inwardIssue?: RawLinkedIssue;
  outwardIssue?: RawLinkedIssue;
}

/**
 * Raw parent reference from API.
 */
interface RawParent {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    status: RawStatus;
    issuetype: RawIssueType;
    priority?: RawPriority;
  };
}

/**
 * Raw subtask reference from API.
 */
interface RawSubtask {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    status: RawStatus;
    issuetype: RawIssueType;
    priority?: RawPriority;
  };
}

/**
 * Raw extended issue from API with parent, subtasks, and links.
 */
interface RawIssueExtended extends RawIssue {
  fields: RawIssue["fields"] & {
    parent?: RawParent;
    subtasks?: RawSubtask[];
    issuelinks?: RawIssueLink[];
  };
}

/**
 * Maps a raw user to domain user.
 */
export function mapUser(raw: RawUser): JiraUser {
  return {
    accountId: raw.accountId,
    displayName: raw.displayName,
    emailAddress: raw.emailAddress,
    avatarUrl: raw.avatarUrls?.["48x48"] ?? raw.avatarUrls?.["32x32"],
    active: raw.active ?? true,
  };
}

/**
 * Maps a raw status to domain status.
 */
export function mapStatus(raw: RawStatus): JiraStatus {
  const categoryKey = raw.statusCategory?.key ?? "undefined";
  const validCategories = ["new", "indeterminate", "done", "undefined"] as const;

  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    categoryKey: validCategories.includes(categoryKey as typeof validCategories[number])
      ? (categoryKey as JiraStatus["categoryKey"])
      : "undefined",
  };
}

/**
 * Maps a raw priority to domain priority.
 */
export function mapPriority(raw: RawPriority): JiraPriority {
  return {
    id: raw.id,
    name: raw.name,
    iconUrl: raw.iconUrl,
  };
}

/**
 * Maps a raw issue type to domain issue type.
 */
export function mapIssueType(raw: RawIssueType): JiraIssueType {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    iconUrl: raw.iconUrl,
    subtask: raw.subtask ?? false,
  };
}

/**
 * Maps a raw project to domain project.
 */
export function mapProject(raw: RawProject): JiraProject {
  return {
    id: raw.id,
    key: raw.key,
    name: raw.name,
    projectTypeKey: raw.projectTypeKey ?? "software",
    avatarUrl: raw.avatarUrls?.["48x48"],
  };
}

/**
 * Maps a raw component to domain component.
 */
export function mapComponent(raw: RawComponent): JiraComponent {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
  };
}

/**
 * Maps a raw sprint to domain sprint.
 */
export function mapSprint(raw: RawSprint): JiraSprint {
  const validStates = ["active", "closed", "future"] as const;
  const state = validStates.includes(raw.state as typeof validStates[number])
    ? (raw.state as JiraSprint["state"])
    : "future";

  return {
    id: raw.id,
    name: raw.name,
    state,
    startDate: raw.startDate,
    endDate: raw.endDate,
    completeDate: raw.completeDate,
    goal: raw.goal,
  };
}

/**
 * Common custom field IDs for story points across Jira instances.
 * These are checked in order, the first match wins.
 */
export const STORY_POINTS_FIELD_CANDIDATES = [
  "customfield_10016", // Most common in Jira Cloud
  "customfield_10026",
  "customfield_10028",
  "customfield_10034",
] as const;

/**
 * Common custom field IDs for sprint across Jira instances.
 * These are checked in order, the first match wins.
 */
export const SPRINT_FIELD_CANDIDATES = [
  "customfield_10020", // Most common in Jira Cloud
  "customfield_10007",
  "customfield_10104",
] as const;

/**
 * Extracts story points from custom fields.
 * Tries multiple common field IDs and returns the first valid number found.
 */
export function extractStoryPoints(fields: Record<string, unknown>): number | undefined {
  for (const fieldId of STORY_POINTS_FIELD_CANDIDATES) {
    const value = fields[fieldId];
    if (typeof value === "number" && !isNaN(value)) {
      return value;
    }
  }
  return undefined;
}

/**
 * Extracts sprint data from custom fields.
 * Tries multiple common field IDs.
 * Returns the active sprint if available, otherwise the most recent sprint.
 */
export function extractSprints(fields: Record<string, unknown>): {
  sprint?: JiraSprint | undefined;
  sprints?: JiraSprint[] | undefined;
} {
  for (const fieldId of SPRINT_FIELD_CANDIDATES) {
    const value = fields[fieldId];
    if (Array.isArray(value) && value.length > 0) {
      // Sprint field is an array of sprint objects
      const sprints = value
        .filter((s): s is RawSprint => s && typeof s === "object" && "id" in s && "name" in s)
        .map(mapSprint);

      if (sprints.length === 0) {
        continue;
      }

      // Return the active sprint if there is one, otherwise the last (most recent) sprint
      const activeSprint = sprints.find((s) => s.state === "active");
      const sprint = activeSprint ?? sprints[sprints.length - 1];

      return { sprint, sprints };
    }
  }
  return {};
}

/**
 * Extracts plain text from Jira content (handles ADF and plain text).
 */
function extractTextContent(content: unknown): string | undefined {
  if (content === null || content === undefined) {
    return undefined;
  }

  if (typeof content === "string") {
    return content;
  }

  // Handle Atlassian Document Format (ADF)
  if (typeof content === "object" && "content" in content) {
    const adf = content as { content?: Array<{ content?: Array<{ text?: string }> }> };
    const texts: string[] = [];

    for (const block of adf.content ?? []) {
      for (const inline of block.content ?? []) {
        if (inline.text) {
          texts.push(inline.text);
        }
      }
    }

    return texts.join("\n") || undefined;
  }

  return undefined;
}

/**
 * Maps a raw issue to domain issue.
 */
export function mapIssue(raw: RawIssue): JiraIssue {
  const fields = raw.fields;
  const storyPoints = extractStoryPoints(fields);
  const { sprint, sprints } = extractSprints(fields);

  return {
    id: raw.id,
    key: raw.key,
    self: raw.self,
    summary: fields.summary,
    description: extractTextContent(fields.description),
    status: mapStatus(fields.status),
    priority: fields.priority ? mapPriority(fields.priority) : undefined,
    issueType: mapIssueType(fields.issuetype),
    project: mapProject(fields.project),
    assignee: fields.assignee ? mapUser(fields.assignee) : undefined,
    reporter: fields.reporter ? mapUser(fields.reporter) : undefined,
    created: fields.created,
    updated: fields.updated,
    labels: fields.labels ?? [],
    components: (fields.components ?? []).map(mapComponent),
    storyPoints,
    sprint,
    sprints,
  };
}

/**
 * Maps a raw issue to compact format with only essential fields.
 * Used for large result sets to reduce token usage.
 */
export function mapIssueCompact(raw: RawIssue): JiraIssueCompact {
  const fields = raw.fields;
  const storyPoints = extractStoryPoints(fields);

  return {
    key: raw.key,
    summary: fields.summary,
    status: fields.status.name,
    priority: fields.priority?.name,
    assignee: fields.assignee?.displayName,
    issueType: fields.issuetype.name,
    storyPoints,
  };
}

/**
 * Maps a raw comment to domain comment.
 */
export function mapComment(raw: RawComment): JiraComment {
  return {
    id: raw.id,
    author: mapUser(raw.author),
    body: extractTextContent(raw.body) ?? "",
    created: raw.created,
    updated: raw.updated,
  };
}

/**
 * Maps a raw search response to domain search result.
 *
 * Supports both the old format (startAt, maxResults, total) and the new
 * Jira Cloud API v3 format (nextPageToken, isLast).
 */
export function mapSearchResult(raw: {
  issues: RawIssue[];
  // Old format fields (deprecated in new API)
  startAt?: number;
  maxResults?: number;
  total?: number;
  // New format fields (Jira Cloud API v3 2024+)
  nextPageToken?: string;
  isLast?: boolean;
}): JiraSearchResult {
  return {
    issues: raw.issues.map(mapIssue),
    startAt: raw.startAt ?? 0,
    maxResults: raw.maxResults ?? raw.issues.length,
    total: raw.total ?? -1, // -1 indicates total is unknown (new API doesn't provide it)
    nextPageToken: raw.nextPageToken,
    isLast: raw.isLast ?? (raw.nextPageToken === undefined),
  };
}

/**
 * Maps a raw comments response to domain comments result.
 */
export function mapCommentsResult(raw: {
  comments: RawComment[];
  startAt: number;
  maxResults: number;
  total: number;
}): JiraCommentsResult {
  return {
    comments: raw.comments.map(mapComment),
    startAt: raw.startAt,
    maxResults: raw.maxResults,
    total: raw.total,
  };
}

/**
 * Maps a raw linked issue reference to domain issue ref.
 */
function mapLinkedIssueRef(raw: RawLinkedIssue): JiraIssueRef {
  const status = mapStatus(raw.fields.status);
  return {
    id: raw.id,
    key: raw.key,
    summary: raw.fields.summary,
    status: status.name,
    statusCategory: status.categoryKey,
    issueType: raw.fields.issuetype.name,
    priority: raw.fields.priority?.name,
  };
}

/**
 * Maps a raw parent to domain issue ref.
 */
function mapParentRef(raw: RawParent): JiraIssueRef {
  const status = mapStatus(raw.fields.status);
  return {
    id: raw.id,
    key: raw.key,
    summary: raw.fields.summary,
    status: status.name,
    statusCategory: status.categoryKey,
    issueType: raw.fields.issuetype.name,
    priority: raw.fields.priority?.name,
  };
}

/**
 * Maps a raw subtask to domain issue ref.
 */
function mapSubtaskRef(raw: RawSubtask): JiraIssueRef {
  const status = mapStatus(raw.fields.status);
  return {
    id: raw.id,
    key: raw.key,
    summary: raw.fields.summary,
    status: status.name,
    statusCategory: status.categoryKey,
    issueType: raw.fields.issuetype.name,
    priority: raw.fields.priority?.name,
  };
}

/**
 * Maps a raw issue link type to domain link type.
 */
function mapIssueLinkType(raw: RawIssueLinkType): JiraIssueLinkType {
  return {
    id: raw.id,
    name: raw.name,
    inward: raw.inward,
    outward: raw.outward,
  };
}

/**
 * Maps a raw issue link to domain issue link.
 */
export function mapIssueLink(raw: RawIssueLink): JiraIssueLink | null {
  // Determine direction and get the linked issue
  if (raw.inwardIssue) {
    return {
      id: raw.id,
      type: mapIssueLinkType(raw.type),
      direction: "inward",
      linkedIssue: mapLinkedIssueRef(raw.inwardIssue),
    };
  }

  if (raw.outwardIssue) {
    return {
      id: raw.id,
      type: mapIssueLinkType(raw.type),
      direction: "outward",
      linkedIssue: mapLinkedIssueRef(raw.outwardIssue),
    };
  }

  // No linked issue data (shouldn't happen in normal API responses)
  return null;
}

/**
 * Maps a raw extended issue to domain extended issue.
 */
export function mapIssueExtended(raw: RawIssueExtended): JiraIssueExtended {
  const baseIssue = mapIssue(raw);
  const fields = raw.fields;

  // Map parent if present
  const parent = fields.parent ? mapParentRef(fields.parent) : undefined;

  // Map subtasks
  const subtasks = (fields.subtasks ?? []).map(mapSubtaskRef);

  // Map issue links (filter out nulls)
  const issueLinks = (fields.issuelinks ?? [])
    .map(mapIssueLink)
    .filter((link): link is JiraIssueLink => link !== null);

  return {
    ...baseIssue,
    parent,
    subtasks,
    issueLinks,
  };
}

// ============================================================================
// Transition Mappers
// ============================================================================

/**
 * Raw transition from Jira API.
 */
interface RawTransition {
  id: string;
  name: string;
  to: RawStatus;
  hasScreen?: boolean;
  isGlobal?: boolean;
  isInitial?: boolean;
  isConditional?: boolean;
}

/**
 * Maps a raw transition to domain transition.
 */
export function mapTransition(raw: RawTransition): JiraTransition {
  return {
    id: raw.id,
    name: raw.name,
    to: mapStatus(raw.to),
    hasScreen: raw.hasScreen ?? false,
    isGlobal: raw.isGlobal ?? false,
    isInitial: raw.isInitial ?? false,
    isConditional: raw.isConditional ?? false,
  };
}

/**
 * Maps a raw transitions response to domain transitions result.
 */
export function mapTransitionsResult(raw: {
  transitions: RawTransition[];
}): JiraTransitionsResult {
  return {
    transitions: raw.transitions.map(mapTransition),
  };
}

/**
 * Converts plain text to Atlassian Document Format (ADF).
 * This is the format required by Jira API v3 for description fields.
 */
export function textToAdf(text: string): object {
  // Split text into paragraphs by double newlines
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());

  const content = paragraphs.map((paragraph) => {
    // Handle single newlines within a paragraph as hard breaks
    const lines = paragraph.split(/\n/);
    const inlineContent: Array<{ type: string; text?: string }> = [];

    lines.forEach((line, index) => {
      if (line.trim()) {
        inlineContent.push({ type: "text", text: line });
      }
      // Add hardBreak between lines (but not after the last line)
      if (index < lines.length - 1) {
        inlineContent.push({ type: "hardBreak" });
      }
    });

    return {
      type: "paragraph",
      content: inlineContent.filter((item) => item.type === "hardBreak" || item.text),
    };
  });

  return {
    type: "doc",
    version: 1,
    content: content.length > 0 ? content : [{ type: "paragraph", content: [] }],
  };
}
