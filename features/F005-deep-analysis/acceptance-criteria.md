# F005: Acceptance Criteria

## Overview

Definition of Done for F005-deep-analysis.

## Functional Criteria

### AC-001: Hierarchy Traversal

**Given** an Epic or Story with children
**When** `jira_deep_analysis` is called
**Then** all children are fetched and analyzed

**Verification:**
- [ ] Direct children are included
- [ ] Traversal respects depth parameter
- [ ] maxChildren limit is enforced

### AC-002: Metric Aggregation

**Given** an issue with children
**When** analyzed
**Then** metrics are aggregated correctly

**Verification:**
- [ ] Total story points summed
- [ ] Status distribution calculated
- [ ] Completion percentage accurate

### AC-003: Anomaly Detection

**Given** issues with quality issues
**When** analyzed
**Then** anomalies are detected

**Verification:**
- [ ] Points mismatch detected (parent != sum of children)
- [ ] Unestimated items flagged
- [ ] Stale in-progress items identified (>5 days)
- [ ] Unassigned items flagged

### AC-004: Linked Issues

**Given** `includeLinks: true`
**When** analyzed
**Then** linked issues are included

**Verification:**
- [ ] Blocking relationships identified
- [ ] Link types categorized
- [ ] Linked issue details included

### AC-005: Output Modes

**Given** `outputMode` parameter
**When** set to 'summary', 'detailed', or 'full'
**Then** output adjusts accordingly

**Verification:**
- [ ] 'summary' = metrics only
- [ ] 'detailed' = metrics + children list
- [ ] 'full' = complete hierarchy details

## Non-Functional Criteria

### NF-001: Performance

- [ ] 50 children analyzed in < 10 seconds
- [ ] Token count adapts to output mode
