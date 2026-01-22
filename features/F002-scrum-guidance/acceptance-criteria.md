# F002: Acceptance Criteria

## Overview

This document defines the Definition of Done for F002-scrum-guidance.

## Functional Criteria

### AC-001: Health Score Calculation

**Given** a valid Jira issue
**When** the `jira_scrum_guidance` tool is called
**Then** a health score (0-100) is returned

**Verification:**
- [ ] Score reflects issue quality
- [ ] Score is reproducible for same input
- [ ] Score considers status, estimates, description quality

### AC-002: Completeness Score Calculation

**Given** a valid Jira issue
**When** the `jira_scrum_guidance` tool is called
**Then** a completeness score (0-100) is returned

**Verification:**
- [ ] Score reflects required field completion
- [ ] Score is issue-type specific
- [ ] Missing fields are identified

### AC-003: Recommendations Generation

**Given** an issue with improvement opportunities
**When** the `jira_scrum_guidance` tool is called
**Then** actionable recommendations are returned

**Verification:**
- [ ] Recommendations are severity-ranked
- [ ] Each recommendation has a clear action
- [ ] Recommendations are issue-type appropriate

### AC-004: Output Levels

**Given** the `level` parameter
**When** set to 'minimal', 'standard', or 'verbose'
**Then** output detail adjusts accordingly

**Verification:**
- [ ] 'minimal' returns only critical issues
- [ ] 'standard' returns balanced output
- [ ] 'verbose' returns all recommendations

### AC-005: Issue Type Handling

**Given** different issue types (Epic, Story, Bug, Task, Subtask)
**When** analyzed
**Then** type-specific rules are applied

**Verification:**
- [ ] Epics check for business value
- [ ] Stories check for acceptance criteria
- [ ] Bugs check for reproduction steps
- [ ] Subtasks check for parent alignment

## Non-Functional Criteria

### NF-001: Performance

- [ ] Analysis completes within 3 seconds
- [ ] No additional API calls beyond issue fetch

### NF-002: Consistency

- [ ] Same issue always produces same scores
- [ ] Rule evaluation is deterministic
