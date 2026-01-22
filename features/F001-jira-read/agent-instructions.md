# F001: Agent Instructions

## Overview

This document provides step-by-step instructions for agents implementing F001.

---

## Required Skills

| Skill | Path | Purpose |
|-------|------|---------|
| `jira-read` | `/skills/jira-read/SKILL.md` | Read operations constraints |

## Tools Touched

| Tool | Operation | Description |
|------|-----------|-------------|
| `get_issue` | Read | Retrieve single issue |
| `search_jql` | Read | JQL-based search |
| `get_issue_comments` | Read | Retrieve issue comments |
| `get_issue_changelog` | Read | Retrieve issue history |

## Expected Outputs

- Structured JSON responses matching tool contracts
- Error responses with actionable messages
- No credentials in logs or responses
- Token-optimized output for large result sets

---

## Prerequisites

Before starting:

1. Read and understand:
   - `/agents.md` (global rules)
   - `/packages/mcp-jira/agents.md` (package rules)
   - `/skills/jira-read/SKILL.md` (skill constraints)
   - This feature's `scope.md` and `architecture.md`
   - This feature's `tool-contracts.md` (input/output specs)

2. Verify:
   - Working on branch `feature/F001-jira-read`
   - No uncommitted changes from other features
   - All dependencies installed

## Implementation Steps

### Step 1: Create Domain Types

**Location:** `packages/mcp-jira/src/domain/types.ts`

Create TypeScript types for:
- JiraIssue
- JiraComment
- JiraProject
- JiraUser
- JiraStatus
- JiraPriority

**Constraints:**
- Use readonly where applicable
- No optional properties without justification
- Export all types

### Step 2: Create Configuration Schema

**Location:** `packages/mcp-jira/src/config/schema.ts`

Create Zod schema for:
- JiraConfig (baseUrl, auth, timeout, retries)

**Constraints:**
- Validate URL format
- Auth credentials must come from env vars
- Provide sensible defaults

### Step 3: Implement Jira Client

**Location:** `packages/mcp-jira/src/domain/jira-client.ts`

Implement:
- Constructor with config validation
- `getIssue(key: string): Promise<JiraIssue>`
- `searchJql(jql: string, options: SearchOptions): Promise<SearchResult>`
- `getComments(key: string, options: PaginationOptions): Promise<Comment[]>`

**Constraints:**
- Use fetch API (no external HTTP libraries)
- Implement retry logic
- Log all requests (redacted)
- Handle all error cases per skill

### Step 4: Create MCP Tools

**Location:** `packages/mcp-jira/src/tools/`

Create tools:
1. `get-issue.ts` - Get single issue
2. `search-jql.ts` - Search with JQL
3. `get-comments.ts` - Get issue comments

**For each tool:**
- Define input schema with Zod
- Validate all inputs
- Call Jira client
- Return structured response
- Handle errors appropriately

### Step 5: Register Tools

**Location:** `packages/mcp-jira/src/tools/index.ts`

Create registration function that:
- Registers all tools with MCP server
- Sets up tool metadata (name, description, schema)

### Step 6: Update Server

**Location:** `packages/mcp-jira/src/server.ts`

Update to:
- Load configuration
- Initialize Jira client
- Register tools

### Step 7: Write Tests

**Location:** `packages/mcp-jira/src/__tests__/`

Create:
- `domain/jira-client.test.ts`
- `tools/get-issue.test.ts`
- `tools/search-jql.test.ts`
- `tools/get-comments.test.ts`

**Requirements:**
- Mock all HTTP calls
- Test success cases
- Test error cases
- Test edge cases

### Step 8: Update Documentation

Update:
- `packages/mcp-jira/README.md` with tool usage
- Add JSDoc to all public functions

## Stop Conditions

**Stop and ask for clarification if:**

- Jira API response format is unclear
- Authentication method is not specified
- Custom fields handling is ambiguous
- Rate limiting strategy needs confirmation
- Test data requirements are unclear

## Commit Strategy

Make commits at these checkpoints:
1. After Step 1-2 (types and config)
2. After Step 3 (Jira client)
3. After Step 4-5 (tools)
4. After Step 6 (server update)
5. After Step 7-8 (tests and docs)

Use conventional commits:
```
feat(mcp-jira): add domain types for Jira entities
feat(mcp-jira): implement Jira API client
feat(mcp-jira): add get_issue MCP tool
test(mcp-jira): add unit tests for Jira client
docs(mcp-jira): document tool usage
```

## Completion Checklist

Before marking complete:

- [ ] All acceptance criteria verified
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Documentation complete
- [ ] PR created and ready for review
