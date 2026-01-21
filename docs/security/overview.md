# Security Overview

## Principles

1. **Least Privilege** - Request minimal permissions
2. **Defense in Depth** - Multiple layers of protection
3. **Fail Secure** - Default to denying access
4. **Audit Everything** - Log all security-relevant events

## Credential Management

### Storage

- Credentials MUST come from environment variables
- Never commit credentials to the repository
- Use `.env.example` for documentation (no real values)

### Handling

- Never log credentials
- Never include credentials in error messages
- Redact sensitive fields in all outputs

## Input Validation

All inputs MUST be validated:

1. Type checking (TypeScript)
2. Schema validation (Zod)
3. Business rule validation

## External Services

### Jira API

- Use API tokens, not passwords
- Tokens should have minimal required scopes
- Implement rate limiting respect

### Git/GitHub

- Use SSH keys or personal access tokens
- Tokens should be scoped to specific repositories
- Never use tokens with admin privileges

## Destructive Operations

All destructive operations MUST:

1. Support dry-run mode
2. Require explicit confirmation flag
3. Log the operation before execution
4. Be reversible where possible

## Incident Response

If a security issue is discovered:

1. Do not commit the fix publicly
2. Contact the security team
3. Follow responsible disclosure

## Security Checklist

- [ ] No hardcoded credentials
- [ ] All inputs validated
- [ ] All outputs sanitized
- [ ] Destructive ops have confirmation
- [ ] Logging does not expose secrets
