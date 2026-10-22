# F010: Rich Text Input (Markdown and ADF)

| Property | Value |
|----------|-------|
| **Feature ID** | F010 |
| **Status** | Stable |
| **Package** | `@ximplicity/mcp-jira` |
| **Skills** | `jira-write` |

## Summary

Rich text fields of the write tools accept Markdown (default), Atlassian Document Format (ADF) or plain text. Markdown is converted to ADF before it is sent to Jira; ADF input is validated and sent as-is.

## Quick Reference

| Tool | Field | Format parameter |
|------|-------|------------------|
| `create_issue` | `description` | `descriptionFormat` |
| `update_issue` | `description` | `descriptionFormat` |
| `transition_issue` | `comment` | `commentFormat` |

Format values: `markdown` (default), `adf`, `text`.

```json
{
  "issueKey": "PROJ-123",
  "description": "## Context\n\n- Item with **bold** text\n- [Link](https://example.com)"
}
```

```json
{
  "issueKey": "PROJ-123",
  "descriptionFormat": "adf",
  "description": {
    "type": "doc",
    "version": 1,
    "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Hello" }] }]
  }
}
```

## Documentation

| Document | Purpose |
|----------|---------|
| [scope.md](./scope.md) | Feature boundaries and dependencies |
| [acceptance-criteria.md](./acceptance-criteria.md) | Definition of Done |
| [agent-instructions.md](./agent-instructions.md) | Implementation guide for agents |
| [tool-contracts.md](./tool-contracts.md) | Tool input/output specifications |

## Related Skills

- [`/skills/jira-write`](../../skills/jira-write/SKILL.md) - Write operation constraints

## See Also

- [F006: Jira Write Operations](../F006-jira-write/README.md) - Tools extended by this feature
