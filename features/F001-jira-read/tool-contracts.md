# F001: Tool Contracts

## Overview

This document defines the input/output contracts for all tools in F001.

---

## get_issue

Retrieves a single Jira issue by its key.

### Input Schema

```typescript
{
  issueKey: string;  // Pattern: ^[A-Z][A-Z0-9]*-\d+$
}
```

### Output Schema

```typescript
{
  key: string;
  summary: string;
  description: string | null;
  status: {
    name: string;
    category: 'todo' | 'indeterminate' | 'done';
  };
  issueType: {
    name: string;
    subtask: boolean;
  };
  priority: {
    name: string;
  } | null;
  assignee: {
    displayName: string;
    accountId: string;
  } | null;
  reporter: {
    displayName: string;
    accountId: string;
  };
  created: string;  // ISO 8601
  updated: string;  // ISO 8601
  storyPoints: number | null;
  labels: string[];
  parent: {
    key: string;
    summary: string;
  } | null;
}
```

### Error Codes

| Code | Condition |
|------|-----------|
| `NOT_FOUND` | Issue does not exist |
| `VALIDATION_ERROR` | Invalid issue key format |
| `AUTH_ERROR` | Invalid or missing credentials |

---

## search_jql

Searches for issues using JQL (Jira Query Language).

### Input Schema

```typescript
{
  jql: string;                    // JQL query
  maxResults?: number;            // Default: 50, Max: 50
  startAt?: number;               // Pagination offset (deprecated)
  nextPageToken?: string;         // Pagination token
  outputMode?: 'auto' | 'compact' | 'full';  // Default: 'auto'
}
```

### Output Schema

```typescript
{
  issues: Array<{
    key: string;
    summary: string;
    status: string;
    assignee: string | null;
    // Additional fields based on outputMode
  }>;
  total: number;
  nextPageToken?: string;
}
```

### Error Codes

| Code | Condition |
|------|-----------|
| `VALIDATION_ERROR` | Invalid JQL syntax |
| `AUTH_ERROR` | Invalid or missing credentials |

---

## get_issue_comments

Retrieves comments for a Jira issue.

### Input Schema

```typescript
{
  issueKey: string;    // Pattern: ^[A-Z][A-Z0-9]*-\d+$
  maxResults?: number; // Default: 50, Max: 100
  startAt?: number;    // Pagination offset
}
```

### Output Schema

```typescript
{
  comments: Array<{
    id: string;
    author: {
      displayName: string;
      accountId: string;
    };
    body: string;
    created: string;  // ISO 8601
    updated: string;  // ISO 8601
  }>;
  total: number;
}
```

### Error Codes

| Code | Condition |
|------|-----------|
| `NOT_FOUND` | Issue does not exist |
| `VALIDATION_ERROR` | Invalid issue key format |

---

## get_issue_changelog

Retrieves the change history for a Jira issue.

### Input Schema

```typescript
{
  issueKey: string;    // Pattern: ^[A-Z][A-Z0-9]*-\d+$
  maxResults?: number; // Default: 100, Max: 100
  startAt?: number;    // Pagination offset
}
```

### Output Schema

```typescript
{
  changelog: Array<{
    id: string;
    author: {
      displayName: string;
      accountId: string;
    };
    created: string;  // ISO 8601
    items: Array<{
      field: string;
      fromString: string | null;
      toString: string | null;
    }>;
  }>;
  total: number;
}
```

### Error Codes

| Code | Condition |
|------|-----------|
| `NOT_FOUND` | Issue does not exist |
| `VALIDATION_ERROR` | Invalid issue key format |
