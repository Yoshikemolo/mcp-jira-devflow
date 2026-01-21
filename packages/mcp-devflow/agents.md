# Agent Rules: mcp-devflow

This document defines agent constraints specific to the `mcp-devflow` package.

## Scope

Agents working on this package may only:

- Implement Git operations
- Create MCP tools for PR automation
- Handle test execution workflows
- Define DevFlow domain types

## Constraints

### Git Operations

- All Git commands must be executed through a centralized executor
- Never force-push without explicit confirmation
- All operations must support dry-run mode
- Branch names must follow conventions

### Pull Request Operations

- PRs must include description and metadata
- Never auto-merge without explicit approval
- All PR operations must be auditable

### Test Execution

- Tests must run in isolated environments
- Test results must be structured and parseable
- Never modify test files during execution

### Security

- No credentials in command arguments
- All paths must be validated and sandboxed
- Destructive operations require confirmation flags

### Tool Design

- Each tool must have a single responsibility
- All tools must validate inputs using schemas
- Error messages must be actionable

## Forbidden Actions

- Direct file system access outside repository
- Network calls to external services (except Git remotes)
- Modifying files outside this package (except shared)
- Implementing features not defined in /features
