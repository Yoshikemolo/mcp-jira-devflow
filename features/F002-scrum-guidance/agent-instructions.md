# F002: Agent Instructions

## Overview

Instructions for implementing Scrum guidance analysis.

---

## Required Skills

| Skill | Path | Purpose |
|-------|------|---------|
| `jira-read` | `/skills/jira-read/SKILL.md` | Fetch issue data |

## Tools Touched

| Tool | Operation | Description |
|------|-----------|-------------|
| `jira_scrum_guidance` | Read | Analyze issue for Scrum compliance |

## Expected Outputs

- Health score: 0-100 integer
- Completeness score: 0-100 integer
- Recommendations array with severity, title, description, action
- Follow-up prompts for user guidance

---

## Prerequisites

Before starting:

1. Read and understand:
   - `/agents.md` (global rules)
   - `/skills/jira-read/SKILL.md` (skill constraints)
   - This feature's `scope.md` and `tool-contracts.md`

2. Verify:
   - F001 is fully implemented
   - Issue fetch functionality works

## Implementation Steps

### Step 1: Create Guidance Types

**Location:** `packages/mcp-jira/src/guidance/types.ts`

Define:
- HealthScore, CompletenessScore
- Recommendation (severity, title, description, action)
- GuidanceResult

### Step 2: Implement Rules Engine

**Location:** `packages/mcp-jira/src/guidance/rules.ts`

Create rules for:
- Description quality
- Acceptance criteria presence
- Estimation completeness
- Status appropriateness
- Assignment status

### Step 3: Implement Analyzer

**Location:** `packages/mcp-jira/src/guidance/analyzer.ts`

- Evaluate all rules against issue
- Calculate health score
- Calculate completeness score
- Generate recommendations

### Step 4: Create Tool

**Location:** `packages/mcp-jira/src/tools/scrum-guidance.ts`

- Define input schema
- Call analyzer
- Format output

## Commit Strategy

```
feat(mcp-jira): add guidance types and interfaces
feat(mcp-jira): implement Scrum rules engine
feat(mcp-jira): add jira_scrum_guidance tool
test(mcp-jira): add guidance analyzer tests
```
