# ADR-001: Monorepo Structure

## Status

Accepted

## Context

We need to organize multiple MCP servers and shared code in a way that:

- Enables code sharing without duplication
- Allows independent versioning
- Supports efficient CI/CD
- Makes navigation intuitive for agents and humans

## Decision

Use a pnpm workspace monorepo with the following structure:

```
/
├── packages/
│   ├── mcp-jira/
│   ├── mcp-devflow/
│   └── shared/
├── features/
├── skills/
└── docs/
```

## Rationale

### Why Monorepo?

- Single source of truth
- Atomic commits across packages
- Simplified dependency management
- Easier refactoring

### Why pnpm?

- Efficient disk usage (hard links)
- Strict dependency resolution
- Built-in workspace support
- Fast installation

### Why This Structure?

- `/packages/` - Clear separation of deployable units
- `/features/` - Feature-based development tracking
- `/skills/` - Agent behavior definitions
- `/docs/` - Centralized documentation

## Consequences

### Positive

- Easy to share code between packages
- Single CI/CD pipeline
- Consistent tooling

### Negative

- Larger repository size over time
- All packages versioned together (for now)
- Learning curve for workspace tooling

## Alternatives Considered

1. **Multi-repo** - Rejected due to coordination overhead
2. **Nx** - Rejected as overkill for current scope
3. **Turborepo** - Considered, may adopt later for caching
