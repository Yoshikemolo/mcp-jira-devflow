# F004: Agent Instructions

## Overview

Instructions for implementing sprint velocity analysis.

---

## Required Skills

| Skill | Path | Purpose |
|-------|------|---------|
| `jira-read` | `/skills/jira-read/SKILL.md` | Fetch sprint and issue data |

## Tools Touched

| Tool | Operation | Description |
|------|-----------|-------------|
| `get_sprint_velocity` | Read | Calculate velocity metrics |

## Expected Outputs

- Average velocity (story points)
- Per-sprint completed vs committed
- Trend indicator
- Completion percentages

---

## Prerequisites

Before starting:

1. Read and understand:
   - `/agents.md` (global rules)
   - `/skills/jira-read/SKILL.md`
   - This feature's `scope.md` and `tool-contracts.md`

2. Verify:
   - F001 and F009 are implemented
   - Board and sprint access works

## Implementation Steps

### Step 1: Create Velocity Types

**Location:** `packages/mcp-jira/src/analysis/velocity/types.ts`

Define:
- SprintMetrics
- VelocityTrend
- VelocityResult

### Step 2: Implement Trend Analyzer

**Location:** `packages/mcp-jira/src/analysis/velocity/trend-analyzer.ts`

- Calculate velocity variance
- Detect trend direction
- Handle edge cases (single sprint)

### Step 3: Create Tool

**Location:** `packages/mcp-jira/src/tools/get-sprint-velocity.ts`

- Fetch closed sprints for board
- Calculate metrics per sprint
- Aggregate and format output

## Commit Strategy

```
feat(mcp-jira): add velocity analysis types
feat(mcp-jira): implement velocity trend analyzer
feat(mcp-jira): add get_sprint_velocity tool
test(mcp-jira): add velocity calculation tests
```
