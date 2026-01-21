# Agent Rules: mcp-jira

This document defines agent constraints specific to the `mcp-jira` package.

## Scope

Agents working on this package may only:

- Implement Jira API integrations
- Create MCP tools for Jira operations
- Handle Jira-specific configuration
- Define Jira domain types

## Constraints

### API Interactions

- All Jira API calls must go through a centralized client
- Never hardcode Jira URLs or credentials
- All API responses must be validated before use
- Rate limiting must be respected

### Security

- Tokens must never be logged
- Credentials must come from environment variables only
- All user inputs must be sanitized before API calls

### Tool Design

- Each tool must have a single responsibility
- All tools must validate inputs using schemas
- All tools must support dry-run mode where applicable
- Error messages must not expose sensitive information

### Testing

- All tools must have unit tests
- Integration tests must use mocked Jira responses
- No real Jira API calls in automated tests

## Forbidden Actions

- Direct database access
- Modifying files outside this package (except shared)
- Creating new MCP servers without explicit approval
- Implementing features not defined in /features
