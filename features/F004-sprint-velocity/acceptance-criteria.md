# F004: Acceptance Criteria

## Overview

Definition of Done for F004-sprint-velocity.

## Functional Criteria

### AC-001: Velocity Calculation

**Given** a project with closed sprints
**When** `get_sprint_velocity` is called
**Then** completed and committed points are returned

**Verification:**
- [ ] Completed points = sum of done issues
- [ ] Committed points = all issues in sprint at close
- [ ] Completion percentage is accurate

### AC-002: Multi-Sprint Analysis

**Given** `sprintCount` parameter
**When** set to N (1-10)
**Then** N most recent closed sprints are analyzed

**Verification:**
- [ ] Respects sprintCount limit
- [ ] Sprints are ordered by end date
- [ ] Average velocity is calculated

### AC-003: Trend Detection

**Given** velocity data from multiple sprints
**When** analyzed
**Then** trend is detected

**Verification:**
- [ ] 'increasing' when velocity grows
- [ ] 'decreasing' when velocity drops
- [ ] 'stable' when variation < 20%
- [ ] 'volatile' when high variation

### AC-004: Output Modes

**Given** `outputMode` parameter
**When** set to 'summary', 'detailed', or 'full'
**Then** output adjusts accordingly

**Verification:**
- [ ] 'summary' = averages only
- [ ] 'detailed' = per-sprint metrics
- [ ] 'full' = includes issue lists

## Non-Functional Criteria

### NF-001: Performance

- [ ] Analysis of 10 sprints < 5 seconds
- [ ] Pagination used for large issue sets
