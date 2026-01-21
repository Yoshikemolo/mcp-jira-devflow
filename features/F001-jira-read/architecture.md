# F001: Architecture

## Overview

This feature adds read-only Jira operations to the `mcp-jira` package.

## Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Client                           │
└─────────────────────┬───────────────────────────────────┘
                      │ MCP Protocol
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  mcp-jira Server                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │                    Tools                         │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐│   │
│  │  │get_issue │ │search_jql│ │get_issue_comments││   │
│  │  └────┬─────┘ └────┬─────┘ └────────┬─────────┘│   │
│  └───────┼────────────┼────────────────┼──────────┘   │
│          │            │                │               │
│  ┌───────▼────────────▼────────────────▼──────────┐   │
│  │              Jira Client                        │   │
│  │  - Authentication                               │   │
│  │  - Request/Response handling                    │   │
│  │  - Rate limiting                                │   │
│  └─────────────────────┬──────────────────────────┘   │
└─────────────────────────┼─────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Jira REST API                         │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

```
packages/mcp-jira/
├── src/
│   ├── server.ts              # MCP server setup
│   ├── tools/
│   │   ├── index.ts           # Tool registration
│   │   ├── get-issue.ts       # Get issue by key
│   │   ├── search-jql.ts      # JQL search
│   │   └── get-comments.ts    # Get issue comments
│   ├── config/
│   │   ├── index.ts           # Configuration loader
│   │   └── schema.ts          # Config validation schema
│   └── domain/
│       ├── jira-client.ts     # Jira API client
│       ├── types.ts           # Jira domain types
│       └── mappers.ts         # API response mappers
```

## Data Flow

### Get Issue Flow

1. MCP Client calls `get_issue` tool with `issueKey`
2. Tool validates input against schema
3. Tool calls Jira Client
4. Jira Client authenticates and makes API request
5. Response is validated and mapped to domain type
6. Tool returns structured response to MCP Client

### Error Flow

1. Validation error → Return immediately with error details
2. Authentication error → Return 401 with safe message
3. Not found → Return 404 with issue key
4. Rate limit → Backoff and retry (max 3 times)
5. Server error → Return 502 with request ID

## Configuration

```typescript
interface JiraConfig {
  baseUrl: string;      // e.g., "https://company.atlassian.net"
  auth: {
    type: "basic" | "oauth" | "pat";
    // Credentials from environment variables
  };
  timeout: number;      // Request timeout in ms
  maxRetries: number;   // Max retry attempts
}
```

## Security Considerations

- All credentials via environment variables
- No credentials in logs or error messages
- HTTPS only
- Request signing for OAuth
