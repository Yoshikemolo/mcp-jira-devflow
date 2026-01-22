# F009: Board & Sprint Management

## Feature ID

F009-board-sprint-management

## Status

**Stable**

## Summary

Board and sprint management operations for Scrum/Kanban workflows.

## In Scope

- List boards (Scrum, Kanban, Simple)
- Filter boards by project, type, name
- List sprints for a board (future, active, closed)
- Get sprint details with issues
- Move issues to sprints
- Update sprint properties (name, dates, goal, state)
- Start and close sprints
- Dry-run support for write operations

## Out of Scope

- Board creation/configuration
- Sprint creation
- Backlog management
- Board column configuration
- Swimlane configuration
- Sprint reports generation

## Dependencies

- F001: Jira Read Operations (base client)
- F006: Jira Write Operations (write patterns)
- Jira Agile REST API access

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Sprint state transitions | High | Validate state machine |
| Moving issues across projects | Medium | Validate project consistency |
| Active sprint conflicts | Medium | Check sprint states |

## Success Criteria

- All board types supported
- Sprint states correctly enforced
- Issue movement validated
- Dry-run accurately reflects changes
