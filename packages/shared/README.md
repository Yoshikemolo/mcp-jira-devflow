# @mcp-jira-devflow/shared

Shared utilities and types for MCP Jira DevFlow packages.

## Modules

### logging

Structured logging with redaction support.

### validation

Input validation utilities using Zod schemas.

### errors

Standardized error types and handling.

### types

Shared TypeScript types and interfaces.

## Usage

```typescript
import { createLogger } from "@mcp-jira-devflow/shared/logging";
import { validateInput } from "@mcp-jira-devflow/shared/validation";
import { AppError } from "@mcp-jira-devflow/shared/errors";
```

## Principles

- No side effects on import
- Pure functions where possible
- Explicit dependencies
- Full TypeScript coverage
