---
name: pr-creation
description: "Create and manage GitHub Pull Requests with templates, reviewers, and labels. Use when the user asks to open a PR, create a pull request, add reviewers, request a code review, or check PR status. Merging requires explicit approval."
license: MIT
compatibility: Requires GitHub CLI (gh) and repository write access
metadata:
  author: ximplicity
  version: "1.0"
  category: git
---

# Pull Request Creation Skill

Create and manage Pull Requests on GitHub with Jira issue linking.

## Allowed Operations

- Create pull requests
- Update PR description
- Add reviewers and labels
- Request reviews
- View PR status and comments

## Forbidden Operations

These require explicit approval:

- Merge PRs
- Close PRs without merging
- Delete branches after merge
- Force-approve PRs

## Constraints

- PRs must have a description
- PRs must reference issue/feature ID
- PRs should have at least one reviewer
- Use draft PRs for work-in-progress

## Workflow

Follow this sequence when creating a PR:

1. **Verify branch** → Confirm the feature branch exists and has commits ahead of base:
   `gh api repos/{owner}/{repo}/compare/{base}...{head} --jq '.ahead_by'`
2. **Create PR** → Use the template and link Jira issues:
   `gh pr create --base main --head feature/PROJ-123 --title "feat: add login" --body-file /tmp/pr-body.md --reviewer alice,bob --label enhancement`
3. **Verify creation** → Confirm the PR was created:
   `gh pr view --json number,url,state`
4. **Add reviewers/labels** (if not set at creation):
   `gh pr edit <number> --add-reviewer alice --add-label bug`

## Quick PR Template

```markdown
## Summary

[Brief description of changes]

## Related Issue

Closes: PROJ-123

## Changes

- [Change 1]
- [Change 2]

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
```

For complete templates, see [PR-TEMPLATES.md](references/PR-TEMPLATES.md).

For review guidelines, see [REVIEW-CHECKLIST.md](references/REVIEW-CHECKLIST.md).

## Dry-Run Mode

When `dryRun: true`:
- Validate all PR fields
- Check branch exists
- Verify reviewers exist
- Show PR preview
- Make NO API calls
