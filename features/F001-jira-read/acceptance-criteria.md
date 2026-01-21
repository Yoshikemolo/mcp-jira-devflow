# F001: Acceptance Criteria

## Overview

This document defines the Definition of Done for F001-jira-read.

## Functional Criteria

### AC-001: Get Issue by Key

**Given** a valid Jira issue key
**When** the `get_issue` tool is called
**Then** the tool returns the issue with all standard fields

**Verification:**
- [ ] Returns issue summary, description, status
- [ ] Returns assignee and reporter
- [ ] Returns priority and issue type
- [ ] Returns created and updated timestamps
- [ ] Returns custom fields (configurable)

### AC-002: Get Issue - Not Found

**Given** an invalid or non-existent issue key
**When** the `get_issue` tool is called
**Then** the tool returns a NotFoundError

**Verification:**
- [ ] Error code is "NOT_FOUND"
- [ ] Error message includes the issue key
- [ ] No sensitive information exposed

### AC-003: Search with JQL

**Given** a valid JQL query
**When** the `search_jql` tool is called
**Then** the tool returns matching issues with pagination

**Verification:**
- [ ] Returns array of issues
- [ ] Respects maxResults parameter (default 50)
- [ ] Returns total count for pagination
- [ ] Supports startAt for pagination

### AC-004: Search - Invalid JQL

**Given** an invalid JQL query
**When** the `search_jql` tool is called
**Then** the tool returns a ValidationError

**Verification:**
- [ ] Error code is "VALIDATION_ERROR"
- [ ] Error message explains JQL issue
- [ ] Original query is not logged

### AC-005: Get Issue Comments

**Given** a valid issue key
**When** the `get_issue_comments` tool is called
**Then** the tool returns all comments for the issue

**Verification:**
- [ ] Returns array of comments
- [ ] Each comment has author, body, created date
- [ ] Comments are ordered by creation date
- [ ] Supports pagination

## Non-Functional Criteria

### NF-001: Performance

- [ ] All tools respond within 5 seconds (p95)
- [ ] Connection pooling implemented
- [ ] No memory leaks on repeated calls

### NF-002: Security

- [ ] No credentials in logs
- [ ] No credentials in error messages
- [ ] All inputs validated before API call
- [ ] HTTPS enforced

### NF-003: Reliability

- [ ] Retry logic for transient failures
- [ ] Circuit breaker for persistent failures
- [ ] Graceful degradation on timeout

### NF-004: Observability

- [ ] Structured logging for all operations
- [ ] Request ID in all log entries
- [ ] Duration logged for all API calls

## Code Quality Criteria

### CQ-001: Testing

- [ ] Unit tests for all tools (>90% coverage)
- [ ] Unit tests for Jira client
- [ ] Integration tests with mocked Jira API
- [ ] All tests pass in CI

### CQ-002: Documentation

- [ ] JSDoc for all public functions
- [ ] README updated with tool usage
- [ ] Error codes documented

### CQ-003: Type Safety

- [ ] No `any` types
- [ ] All API responses typed
- [ ] Strict TypeScript mode passes
