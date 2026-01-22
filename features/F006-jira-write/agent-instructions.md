# F006: Agent Instructions

## Overview

Instructions for implementing Jira write operations.

---

## Required Skills

| Skill | Path | Purpose |
|-------|------|---------|
| `jira-read` | `/skills/jira-read/SKILL.md` | Fetch data for validation |
| `jira-write` | `/skills/jira-write/SKILL.md` | Write operation constraints |

## Tools Touched

| Tool | Operation | Description |
|------|-----------|-------------|
| `create_issue` | Write | Create new issues |
| `update_issue` | Write | Update existing issues |
| `transition_issue` | Write | Change issue status |

## Expected Outputs

- Created/updated issue details
- Validation results for dry-run
- Available transitions list
- Clear error messages

---

## Prerequisites

Before starting:

1. Read and understand:
   - `/agents.md` (global rules)
   - `/skills/jira-write/SKILL.md` - **Critical: dry-run requirements**
   - F001 implementation

2. Verify:
   - Read operations work
   - Test Jira instance available

## Implementation Steps

### Step 1: Extend Jira Client

**Location:** `packages/mcp-jira/src/domain/jira-client.ts`

Add methods:
- `createIssue(data): Promise<Issue>`
- `updateIssue(key, data): Promise<Issue>`
- `getTransitions(key): Promise<Transition[]>`
- `transitionIssue(key, transitionId, data): Promise<void>`

### Step 2: Create Issue Tool

**Location:** `packages/mcp-jira/src/tools/create-issue.ts`

- Define comprehensive input schema
- Validate required fields per issue type
- Implement dry-run logic
- Handle parent linking for subtasks

### Step 3: Update Issue Tool

**Location:** `packages/mcp-jira/src/tools/update-issue.ts`

- Partial update support
- Fetch current values for dry-run comparison
- Validate field changes

### Step 4: Transition Tool

**Location:** `packages/mcp-jira/src/tools/transition-issue.ts`

- List available transitions
- Validate transition is allowed
- Handle required fields
- Support transition comments

## Important Constraints

From `/skills/jira-write/SKILL.md`:
- Dry-run mode MUST be supported
- Validate before write
- Never assume permissions

## Commit Strategy

```
feat(mcp-jira): extend Jira client with write methods
feat(mcp-jira): add create_issue tool with dry-run
feat(mcp-jira): add update_issue tool with dry-run
feat(mcp-jira): add transition_issue tool
test(mcp-jira): add write operation tests
```
