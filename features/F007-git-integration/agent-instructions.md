# F007: Agent Instructions

## Overview

Instructions for implementing Git-Jira integration.

---

## Required Skills

| Skill | Path | Purpose |
|-------|------|---------|
| `jira-read` | `/skills/jira-read/SKILL.md` | Fetch issue details |
| `git-jira-integration` | `/skills/git-jira-integration/SKILL.md` | Git workflow rules |

## Tools Touched

| Tool | Operation | Description |
|------|-----------|-------------|
| `devflow_git_link_repo` | Write | Store repo-project link |
| `devflow_git_get_repos` | Read | List linked repos |
| `devflow_git_branch_name` | Read | Generate branch name |
| `devflow_git_validate_commit` | Read | Validate commit message |

## Expected Outputs

- Git-compatible branch names
- Validation results with suggestions
- Ready-to-use git commands

---

## Prerequisites

Before starting:

1. Read and understand:
   - `/agents.md` (global rules)
   - `/skills/git-jira-integration/SKILL.md`
   - `/skills/git-jira-integration/references/BRANCH-CONVENTIONS.md`
   - `/skills/git-jira-integration/references/COMMIT-MESSAGE-FORMAT.md`

2. Verify:
   - F001 is implemented
   - Issue fetch works

## Implementation Steps

### Step 1: Create Git Types

**Location:** `packages/mcp-jira/src/git/types.ts`

Define:
- RepositoryLink
- BranchNameResult
- CommitValidationResult
- BranchType enum

### Step 2: Implement Repository Store

**Location:** `packages/mcp-jira/src/git/repository-store.ts`

- In-memory storage
- URL validation
- Project key association

### Step 3: Implement Branch Generator

**Location:** `packages/mcp-jira/src/git/branch-generator.ts`

- Issue type to branch type mapping
- Summary to slug conversion
- Pattern placeholder replacement
- Length limiting

### Step 4: Implement Commit Validator

**Location:** `packages/mcp-jira/src/git/commit-validator.ts`

- Conventional commits regex
- Issue key extraction
- Subject length check
- Suggestion generation

### Step 5: Create Tools

**Location:** `packages/mcp-jira/src/tools/git-*.ts`

- `git-link-repo.ts`
- `git-get-repos.ts`
- `git-branch-name.ts`
- `git-validate-commit.ts`

## Commit Strategy

```
feat(mcp-jira): add Git integration types
feat(mcp-jira): implement repository store
feat(mcp-jira): add branch name generator
feat(mcp-jira): implement commit validator
feat(mcp-jira): add Git integration tools
```
