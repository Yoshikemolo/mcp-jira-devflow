# F005: Deep Analysis

## Feature ID

F005-deep-analysis

## Status

**Stable**

## Summary

Comprehensive hierarchical analysis of Jira issues including parent-child relationships, linked issues, and metric aggregation.

## In Scope

- Epic → Story → Subtask hierarchy traversal
- Metric aggregation (story points, status distribution)
- Anomaly detection:
  - Story point mismatches
  - Unestimated children
  - Stale in-progress issues
  - Unassigned work
- Linked issue analysis
- Token-optimized output modes
- Configurable traversal depth

## Out of Scope

- Cross-project analysis
- Historical trend analysis
- Automatic issue modification
- Custom anomaly rules

## Dependencies

- F001: Jira Read Operations
- F002: Scrum Guidance (optional, for recommendations)
- `/skills/jira-read` - Operational constraints

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large hierarchies | High | Configurable maxChildren, depth limits |
| API rate limiting | Medium | Batch requests, caching |
| Circular links | Low | Cycle detection |

## Success Criteria

- Hierarchy traversal is complete and accurate
- Anomalies match manual inspection
- Output adapts to hierarchy size
- Performance acceptable for large epics
