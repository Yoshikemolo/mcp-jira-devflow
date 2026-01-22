# F008: Agent Instructions

## Overview

Instructions for implementing PR context generation.

---

## Required Skills

| Skill | Path | Purpose |
|-------|------|---------|
| `jira-read` | `/skills/jira-read/SKILL.md` | Fetch issue details |
| `git-jira-integration` | `/skills/git-jira-integration/SKILL.md` | Git conventions |
| `pr-creation` | `/skills/pr-creation/SKILL.md` | PR content rules |

## Tools Touched

| Tool | Operation | Description |
|------|-----------|-------------|
| `devflow_git_pr_context` | Read | Generate PR content |

## Expected Outputs

- PR title suggestion
- Complete PR body markdown
- Label suggestions
- Reviewer suggestions (optional)

---

## Prerequisites

Before starting:

1. Read and understand:
   - `/agents.md` (global rules)
   - `/skills/pr-creation/SKILL.md`
   - `/skills/git-jira-integration/references/PR-TEMPLATES.md`

2. Verify:
   - F001 and F007 implemented
   - Issue fetch works

## Implementation Steps

### Step 1: Create PR Context Types

**Location:** `packages/mcp-jira/src/git/types.ts`

Add:
- PRContext
- PRBodySection
- LabelSuggestion

### Step 2: Implement PR Context Builder

**Location:** `packages/mcp-jira/src/git/pr-context-builder.ts`

- Title generation logic
- Body template assembly
- AC extraction from description
- Testing checklist generation
- Label inference

### Step 3: Create Tool

**Location:** `packages/mcp-jira/src/tools/git-pr-context.ts`

- Multi-issue support
- Optional sections
- Markdown formatting

## Key Implementation Details

### Acceptance Criteria Extraction

Look for patterns in description:
- "Acceptance Criteria:" section
- "Given/When/Then" blocks
- Checkbox lists `- [ ]`

### Testing Checklist Generation

Based on issue type:
- Story: functionality, edge cases, UI
- Bug: fix verification, regression, root cause
- Task: completion criteria

## Commit Strategy

```
feat(mcp-jira): add PR context types
feat(mcp-jira): implement PR context builder
feat(mcp-jira): add devflow_git_pr_context tool
test(mcp-jira): add PR context generation tests
```
