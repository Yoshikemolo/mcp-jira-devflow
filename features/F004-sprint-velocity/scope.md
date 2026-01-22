# F004: Sprint Velocity

## Feature ID

F004-sprint-velocity

## Status

**Stable**

## Summary

Calculate sprint velocity metrics from closed sprints to support capacity planning.

## In Scope

- Completed story points per sprint
- Committed story points per sprint
- Completion percentage calculation
- Multi-sprint velocity averaging
- Velocity trend detection (increasing, stable, decreasing, volatile)
- Per-sprint breakdown with issue details

## Out of Scope

- Real-time sprint tracking
- Individual contributor metrics
- Time-based velocity (hours)
- Cross-project velocity comparison
- Predictive modeling (see DevFlow features)

## Dependencies

- F001: Jira Read Operations
- F009: Board & Sprint Management (for sprint access)
- `/skills/jira-read` - Operational constraints

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Missing story points | High | Warn about unestimated items |
| Sprint scope changes | Medium | Use sprint completion state |
| Large datasets | Medium | Limit sprint count, pagination |

## Success Criteria

- Velocity matches manual calculation
- Trend detection is accurate
- Output is token-efficient
- No API rate limiting issues
