---
name: test-execution
description: "Run test suites, check code coverage, and diagnose test failures. Use when the user asks to run tests, execute a test suite, check test coverage, verify test results, or investigate failing tests."
license: MIT
compatibility: Requires Node.js test runner (vitest, jest) or project-specific test framework
metadata:
  author: ximplicity
  version: "1.0"
  category: testing
---

# Test Execution Skill

Run and manage automated tests with structured result analysis.

## Allowed Operations

- Run unit, integration, and E2E tests
- Run specific test files or filter by pattern
- Generate and check coverage reports
- Analyze test failures and suggest fixes

## Forbidden Operations

- Modify test files during execution
- Skip tests without documentation
- Disable coverage thresholds
- Run tests against production
- Commit test snapshots without review

## Constraints

- Tests must run in isolated environment
- No network calls to external services (use mocks)
- Test timeout: 30 seconds per test
- Coverage minimum: 80%

## Workflow

Follow this sequence when running tests:

1. **Run tests** → Execute the appropriate command for the scope requested
2. **Check exit code** → Non-zero means failures exist
3. **Review failures** → Parse error output, identify root cause per failing test
4. **Verify coverage** → Compare against 80% threshold; flag any drops
5. **Report results** → Summarize passed/failed/skipped counts and coverage

## Quick Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific file
npm test -- path/to/test.ts

# Run by pattern
npm test -- --grep "auth"
```

## Test Categories

| Type | Speed | Dependencies | When to Run |
|------|-------|--------------|-------------|
| Unit | Fast | Mocked | Every commit |
| Integration | Medium | Test fixtures | Before merge |
| E2E | Slow | Full stack | Before release |

For detailed test patterns, see [TEST-PATTERNS.md](references/TEST-PATTERNS.md).

For coverage configuration, see [COVERAGE-GUIDE.md](references/COVERAGE-GUIDE.md).

## Failure Handling Example

When a test fails, parse the output to extract actionable details:

```
FAIL src/auth/login.test.ts
  ✕ should reject invalid credentials (12ms)

  Error: Expected status 401, received 500
    at Object.<anonymous> (src/auth/login.test.ts:24:5)
```

Action: The 500 indicates an unhandled error in the login handler rather than a proper 401 rejection. Check `src/auth/login.ts` around the credential validation path for missing error handling.
