# F006: Acceptance Criteria

## Overview

Definition of Done for F006-jira-write.

## Functional Criteria

### AC-001: Create Issue

**Given** valid issue data
**When** `create_issue` is called
**Then** a new issue is created

**Verification:**
- [ ] Issue created with all provided fields
- [ ] Returns new issue key
- [ ] Subtasks linked to parent correctly

### AC-002: Create Issue - Dry Run

**Given** `dryRun: true`
**When** `create_issue` is called
**Then** validates without creating

**Verification:**
- [ ] No issue created
- [ ] Validation errors returned
- [ ] Would-be values shown

### AC-003: Update Issue

**Given** valid update data
**When** `update_issue` is called
**Then** issue is updated

**Verification:**
- [ ] Only specified fields change
- [ ] Unchanged fields preserved
- [ ] Returns updated issue

### AC-004: Update Issue - Dry Run

**Given** `dryRun: true`
**When** `update_issue` is called
**Then** validates without updating

**Verification:**
- [ ] No changes made
- [ ] Current vs proposed shown
- [ ] Validation errors returned

### AC-005: Transition Issue

**Given** valid transition
**When** `transition_issue` is called
**Then** issue status changes

**Verification:**
- [ ] Status updated
- [ ] Transition comment added if provided
- [ ] Required fields validated

### AC-006: List Transitions

**Given** `listTransitions: true`
**When** `transition_issue` is called
**Then** available transitions returned

**Verification:**
- [ ] All valid transitions listed
- [ ] Required fields indicated
- [ ] No status change occurs

## Non-Functional Criteria

### NF-001: Security

- [ ] No credentials in error messages
- [ ] Permissions errors handled gracefully

### NF-002: Idempotency

- [ ] Repeated updates with same data are safe
