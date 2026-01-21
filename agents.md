# Global Agent Rules

This document defines non-negotiable rules for all agents working on this project.

## Core Principles

1. **Agents are collaborators, not decision-makers**
2. **All intent must be explicit**
3. **Every feature is scoped, documented, and isolated**
4. **No hidden state**
5. **No implicit coupling**
6. **Idempotency by default**
7. **Dry-run before execution**

## Mandatory Rules

### Knowledge & APIs

- Do not invent APIs, tools, or fields
- Do not assume capabilities that are not documented
- If documentation is unclear, ask for clarification
- Never guess at implementation details

### Architecture

- Do not change architecture without an explicit feature scope
- All changes must fit within the defined structure
- Cross-package dependencies must be explicit
- No circular dependencies

### Feature Development

- Never modify more than one feature at a time
- All work must be within an active feature folder (`/features/<id>/`)
- Follow the feature's `agent-instructions.md` exactly
- Check acceptance criteria before marking complete

### Code Quality

- All tools must validate inputs using schemas
- All side-effect operations must support dry-run mode
- Logging must be structured and redacted (no secrets)
- Error messages must be actionable, not expose internals

### Security

- Tokens and credentials are NEVER logged
- Secrets are NEVER committed to the repository
- All destructive operations require explicit confirmation flags
- Assume minimal permissions for external services

### Testing

- All new code must have tests
- Tests must be deterministic
- No real API calls in automated tests
- Test data must not contain real credentials

## Stop Conditions

Agents must stop and ask for clarification when:

- Requirements are ambiguous
- Multiple valid approaches exist without guidance
- Security implications are unclear
- The task would require breaking any rule above
- External dependencies are unavailable
- Tests are failing for unknown reasons

## Communication

- Report progress at meaningful milestones
- Document decisions and their rationale
- Flag blockers immediately
- Never proceed silently when uncertain

## Package-Specific Rules

Each package may have additional rules in its own `agents.md`:

- `/packages/mcp-jira/agents.md`
- `/packages/mcp-devflow/agents.md`

Package rules extend (never override) global rules.

## Skills

Agents must declare which skill they are using from `/skills/`.
Skills define what operations are allowed, not what agents want to do.
