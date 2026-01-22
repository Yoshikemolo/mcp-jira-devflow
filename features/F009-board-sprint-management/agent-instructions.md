# F009: Agent Instructions

## Overview

Instructions for implementing board and sprint management.

---

## Required Skills

| Skill | Path | Purpose |
|-------|------|---------|
| `jira-read` | `/skills/jira-read/SKILL.md` | Fetch board/sprint data |
| `jira-write` | `/skills/jira-write/SKILL.md` | Modify sprints |

## Tools Touched

| Tool | Operation | Description |
|------|-----------|-------------|
| `get_boards` | Read | List Jira boards |
| `get_board_sprints` | Read | List sprints for board |
| `get_sprint` | Read | Get sprint with issues |
| `move_issues_to_sprint` | Write | Move issues to sprint |
| `update_sprint` | Write | Update sprint properties |

## Expected Outputs

- Board lists with metadata
- Sprint details with issues
- Movement confirmation
- Update results

---

## Prerequisites

Before starting:

1. Read and understand:
   - `/agents.md` (global rules)
   - `/skills/jira-write/SKILL.md` - dry-run requirements
   - Jira Agile REST API documentation

2. Verify:
   - F001 and F006 implemented
   - Agile API endpoints accessible

## Implementation Steps

### Step 1: Extend Jira Client

**Location:** `packages/mcp-jira/src/domain/jira-client.ts`

Add Agile API methods:
- `getBoards(filters): Promise<Board[]>`
- `getBoardSprints(boardId, state): Promise<Sprint[]>`
- `getSprint(sprintId): Promise<Sprint>`
- `getSprintIssues(sprintId, jql): Promise<Issue[]>`
- `moveIssuesToSprint(sprintId, issueKeys): Promise<void>`
- `updateSprint(sprintId, data): Promise<Sprint>`

### Step 2: Create Board Tools

**Location:** `packages/mcp-jira/src/tools/`

- `get-boards.ts` - List boards with filters
- `get-board-sprints.ts` - List sprints

### Step 3: Create Sprint Tools

**Location:** `packages/mcp-jira/src/tools/`

- `get-sprint.ts` - Sprint details with issues
- `move-issues-to-sprint.ts` - Move issues
- `update-sprint.ts` - Update properties

### Step 4: Implement State Validation

Validate sprint state transitions:
- Only future sprints can be started
- Only active sprints can be closed
- Closed sprints cannot change state

## Commit Strategy

```
feat(mcp-jira): extend Jira client with Agile API
feat(mcp-jira): add get_boards tool
feat(mcp-jira): add get_board_sprints tool
feat(mcp-jira): add get_sprint tool
feat(mcp-jira): add move_issues_to_sprint tool
feat(mcp-jira): add update_sprint tool
test(mcp-jira): add board and sprint tests
```
