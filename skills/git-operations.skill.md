# Git Operations Skill

Skill for Git repository operations.

## Allowed Operations

- Clone repositories
- Create branches
- Switch branches
- Commit changes
- Push to remote
- Pull from remote
- Fetch updates
- View status
- View log
- View diff

## Forbidden Operations

- Force push (requires explicit approval)
- Rebase (requires explicit approval)
- Reset --hard (requires explicit approval)
- Delete remote branches without confirmation
- Modify git hooks
- Change git config globally

## Constraints

- All destructive operations require confirmation flag
- Branch names must follow convention: `feature/`, `fix/`, `chore/`
- Commit messages must follow conventional commits
- No commits to `main` or `master` directly

## Branch Naming Convention

```
<type>/<feature-id>-<short-description>

Examples:
- feature/F001-jira-read
- fix/F001-connection-timeout
- chore/update-dependencies
```

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
- Verify working directory is clean (or stash)
- Verify on correct branch
- Verify remote is reachable
- Check for uncommitted changes
