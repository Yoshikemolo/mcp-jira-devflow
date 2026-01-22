---
name: git-operations
description: Git repository operations including branching, committing, pushing, and viewing history. Use for version control tasks. Destructive operations require explicit approval.
license: MIT
compatibility: Requires git CLI installed and repository access
metadata:
  author: ximplicity
  version: "1.0"
  category: git
---

# Git Operations Skill

Version control operations for Git repositories.

## Allowed Operations

- Clone repositories
- Create branches
- Switch branches
- Commit changes
- Push to remote
- Pull from remote
- Fetch updates
- View status, log, diff

## Forbidden Operations

These require explicit user approval:

- Force push (`--force`)
- Rebase
- Reset `--hard`
- Delete remote branches
- Modify git hooks
- Change git config globally

## Constraints

- All destructive operations require confirmation flag
- Branch names must follow convention
- Commit messages must follow conventional commits
- No direct commits to `main` or `master`

## Branch Naming Convention

```
<type>/<issue-id>-<short-description>

Examples:
- feature/PROJ-123-add-login
- fix/PROJ-456-null-pointer
- chore/update-dependencies
```

Valid types: `feature`, `fix`, `chore`, `docs`, `refactor`

## Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Dry-Run Mode

When `dryRun: true`:

- Show what commands would execute
- Validate branch names
- Check remote connectivity
- Make NO changes

## Safety Checks

Before any operation:

1. Verify working directory is clean (or stash)
2. Verify on correct branch
3. Verify remote is reachable
4. Check for uncommitted changes

## Example Usage

```
Create branch feature/PROJ-123-user-auth
Commit changes with message "feat(auth): add login endpoint"
Push current branch to origin
Show git status and recent commits
```
