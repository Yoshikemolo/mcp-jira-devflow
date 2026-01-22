---
name: test-execution
description: Run unit and integration tests, generate coverage reports, and view results. Use to validate code changes before committing or merging.
license: MIT
compatibility: Requires Node.js test runner (vitest, jest) or project-specific test framework
metadata:
  author: ximplicity
  version: "1.0"
  category: testing
---

# Test Execution Skill

Run and manage automated tests.

## Allowed Operations

- Run unit tests
- Run integration tests
- Run specific test files
- Run tests by pattern
- Generate coverage reports
- View test results

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

## Test Categories

### Unit Tests

- Fast, isolated
- No I/O operations
- Mock all dependencies
- Run on every commit

### Integration Tests

- Test component interactions
- Use test fixtures
- May use test database
- Run before merge

## Output Format

```json
{
  "passed": 42,
  "failed": 0,
  "skipped": 2,
  "duration": 1234,
  "coverage": {
    "lines": 85.5,
    "branches": 80.2,
    "functions": 90.0
  }
}
```

## Failure Handling

- Capture full error output
- Include stack traces
- Show relevant code context
- Suggest potential fixes if obvious

## CI Integration

- Exit code 0 for all pass
- Exit code 1 for any failure
- Write results to standard locations
- Support JUnit XML format

## Example Usage

```
Run all unit tests
Run tests matching "auth"
Run tests with coverage report
Show results of last test run
```
