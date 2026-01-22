# F009: Acceptance Criteria

## Overview

Definition of Done for F009-board-sprint-management.

## Functional Criteria

### AC-001: List Boards

**Given** a Jira instance
**When** `get_boards` is called
**Then** boards are returned

**Verification:**
- [ ] All board types included
- [ ] Filters work (project, type, name)
- [ ] Pagination supported

### AC-002: List Sprints

**Given** a valid board ID
**When** `get_board_sprints` is called
**Then** sprints are returned

**Verification:**
- [ ] State filter works (future/active/closed/all)
- [ ] Ordered by start date
- [ ] Includes sprint metadata

### AC-003: Get Sprint Details

**Given** a valid sprint ID
**When** `get_sprint` is called
**Then** sprint with issues returned

**Verification:**
- [ ] Sprint metadata complete
- [ ] Issues included (respects includeIssues)
- [ ] JQL filter works
- [ ] Output mode adapts

### AC-004: Move Issues

**Given** issue keys and sprint ID
**When** `move_issues_to_sprint` is called
**Then** issues are moved

**Verification:**
- [ ] Issues added to sprint
- [ ] Validation performed first
- [ ] Dry-run shows changes

### AC-005: Update Sprint

**Given** sprint ID and updates
**When** `update_sprint` is called
**Then** sprint is updated

**Verification:**
- [ ] Name, dates, goal update
- [ ] State transitions (start/close)
- [ ] Dry-run supported
- [ ] Invalid transitions rejected

### AC-006: Sprint State Machine

**Given** a sprint in various states
**When** state transitions attempted
**Then** only valid transitions succeed

**Verification:**
- [ ] future → active (start)
- [ ] active → closed (complete)
- [ ] closed → (no transitions)

## Non-Functional Criteria

### NF-001: Performance

- [ ] Board list < 2 seconds
- [ ] Sprint details with 50 issues < 5 seconds
