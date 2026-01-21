# F001: Jira Read Operations

## Feature ID

F001-jira-read

## Status

**Not Started**

## Summary

Implement read-only operations for Jira issues via MCP tools.

## In Scope

- Read single issue by key
- Search issues using JQL
- Read issue metadata (status, assignee, priority, etc.)
- Read issue comments
- List available projects
- Read project metadata

## Out of Scope

- Creating issues
- Updating issues
- Transitioning issues
- Writing comments
- Attachments
- Sprint management
- Board operations

## Dependencies

- `@mcp-jira-devflow/shared` - Validation and error handling
- Jira REST API v3 access
- Valid Jira authentication credentials

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Rate limiting | Medium | Implement backoff and caching |
| API changes | Low | Use versioned API endpoints |
| Large result sets | Medium | Enforce pagination limits |

## Success Criteria

- All MCP tools respond within 5 seconds
- 100% input validation coverage
- No credentials exposed in logs
- All operations are idempotent
