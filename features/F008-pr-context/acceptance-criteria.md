# F008: Acceptance Criteria

## Overview

Definition of Done for F008-pr-context.

## Functional Criteria

### AC-001: PR Title Generation

**Given** one or more issue keys
**When** `devflow_git_pr_context` is called
**Then** a PR title is generated

**Verification:**
- [ ] Single issue: includes key and summary
- [ ] Multiple issues: combines appropriately
- [ ] Length reasonable (< 100 chars)

### AC-002: PR Body Generation

**Given** valid issue keys
**When** PR context generated
**Then** body includes required sections

**Verification:**
- [ ] Summary section present
- [ ] Related issues linked
- [ ] Jira links included

### AC-003: Acceptance Criteria Extraction

**Given** `includeAcceptanceCriteria: true`
**When** issues have AC defined
**Then** AC is included in body

**Verification:**
- [ ] AC extracted from description
- [ ] Formatted as checklist
- [ ] Handles missing AC gracefully

### AC-004: Testing Checklist

**Given** `includeTestingChecklist: true`
**When** PR context generated
**Then** testing checklist included

**Verification:**
- [ ] Based on issue types
- [ ] Actionable items
- [ ] Bug issues get regression items

### AC-005: Label Suggestions

**Given** issues of various types
**When** PR context generated
**Then** labels suggested

**Verification:**
- [ ] Bug → 'bug' label
- [ ] Story → 'feature' label
- [ ] Size labels based on points

## Non-Functional Criteria

### NF-001: Output Quality

- [ ] Markdown properly formatted
- [ ] No broken links
- [ ] Copy-paste ready
