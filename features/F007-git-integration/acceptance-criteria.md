# F007: Acceptance Criteria

## Overview

Definition of Done for F007-git-integration.

## Functional Criteria

### AC-001: Link Repository

**Given** a repository URL and project key
**When** `devflow_git_link_repo` is called
**Then** the link is stored

**Verification:**
- [ ] URL validated (HTTPS or SSH format)
- [ ] Project key validated
- [ ] Link retrievable via get_repos

### AC-002: Generate Branch Name

**Given** a valid issue key
**When** `devflow_git_branch_name` is called
**Then** a valid branch name is generated

**Verification:**
- [ ] Contains issue key
- [ ] Type prefix based on issue type
- [ ] Slug from summary
- [ ] No invalid characters
- [ ] Respects max length

### AC-003: Branch Type Inference

**Given** different issue types
**When** branch name generated
**Then** correct type prefix used

**Verification:**
- [ ] Bug → `fix/`
- [ ] Story/Feature → `feature/`
- [ ] Task → `chore/`
- [ ] Hotfix (priority) → `hotfix/`

### AC-004: Validate Commit Message

**Given** a commit message
**When** `devflow_git_validate_commit` is called
**Then** validation result returned

**Verification:**
- [ ] Conventional format checked
- [ ] Issue key presence checked
- [ ] Subject length validated
- [ ] Suggestions provided

### AC-005: Custom Branch Pattern

**Given** a custom format pattern
**When** branch name generated
**Then** pattern is applied

**Verification:**
- [ ] `{type}`, `{key}`, `{slug}` placeholders work
- [ ] Custom separators supported

## Non-Functional Criteria

### NF-001: Performance

- [ ] Branch generation < 1 second
- [ ] Validation < 100ms
