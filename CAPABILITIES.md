# MCP Jira DevFlow Capabilities

> Auto-generated from features directory. Do not edit manually.

## Overview

This document provides an overview of all 8 capabilities available in MCP Jira DevFlow.

## Capabilities Summary

| ID | Name | Status | Tools |
|----|------|--------|-------|
| F001 | Read-only operations for retrieving Jira issues, c... | Implemented | 4 |
| F002 | AI-powered Scrum best-practice analysis that evalu... | Stable | 1 |
| F004 | Calculate and analyze sprint velocity metrics incl... | Stable | 1 |
| F005 | Hierarchical issue analysis with parent-child trav... | Stable | 1 |
| F006 | Write operations for creating, updating, and trans... | Stable | 3 |
| F007 | Git-Jira integration for repository linking, branc... | Stable | 4 |
| F008 | Generate Pull Request context from Jira issues inc... | Stable | 1 |
| F009 | Manage Jira boards and sprints including listing, ... | Stable | 5 |

## Detailed Capabilities

### F001: Jira Read

**Status:** Implemented
**Package:** `@ximplicity/mcp-jira`
**Skills:** `jira-read`

Read-only operations for retrieving Jira issues, comments, and search results via MCP tools.

**Tools:**
- `get_issue` - Retrieve single issue by key
- `search_jql` - Search issues using JQL queries
- `get_issue_comments` - Get comments for an issue
- `get_issue_changelog` - Get change history for an issue

**Capabilities:**
- Read single issue by key
- Search issues using JQL
- Read issue metadata (status, assignee, priority, etc.)
- Read issue comments
- List available projects
- ... and 1 more

[Full Documentation](./features/F001-jira-read/)

---

### F002: Scrum Guidance

**Status:** Stable
**Package:** `@ximplicity/mcp-jira`
**Skills:** `jira-read`

AI-powered Scrum best-practice analysis that evaluates issues against agile standards and provides actionable recommendations.

**Tools:**
- `jira_scrum_guidance` - Analyze issue for Scrum compliance

**Capabilities:**
- Health score calculation (0-100)
- Completeness score calculation (0-100)
- Best-practice rule evaluation
- Severity-ranked recommendations (Critical, High, Medium, Low)
- Issue type-specific guidance (Epic, Story, Task, Bug, Subtask)
- ... and 2 more

[Full Documentation](./features/F002-scrum-guidance/)

---

### F004: Sprint Velocity

**Status:** Stable
**Package:** `@ximplicity/mcp-jira`
**Skills:** `jira-read`

Calculate and analyze sprint velocity metrics including completed vs committed story points, trend analysis, and capacity insights.

**Tools:**
- `get_sprint_velocity` - Calculate velocity metrics for closed sprints

**Capabilities:**
- Completed story points per sprint
- Committed story points per sprint
- Completion percentage calculation
- Multi-sprint velocity averaging
- Velocity trend detection (increasing, stable, decreasing, volatile)
- ... and 1 more

[Full Documentation](./features/F004-sprint-velocity/)

---

### F005: Deep Analysis

**Status:** Stable
**Package:** `@ximplicity/mcp-jira`
**Skills:** `jira-read`

Hierarchical issue analysis with parent-child traversal, metric aggregation, anomaly detection, and comprehensive health assessment.

**Tools:**
- `jira_deep_analysis` - Analyze issue hierarchy with metrics and anomalies

**Capabilities:**
- Epic → Story → Subtask hierarchy traversal
- Metric aggregation (story points, status distribution)
- Anomaly detection:
- Linked issue analysis
- Token-optimized output modes
- ... and 1 more

[Full Documentation](./features/F005-deep-analysis/)

---

### F006: Jira Write

**Status:** Stable
**Package:** `@ximplicity/mcp-jira`
**Skills:** `jira-read, jira-write`

Write operations for creating, updating, and transitioning Jira issues with dry-run support and validation.

**Tools:**
- `create_issue` - Create new issues
- `update_issue` - Update existing issues
- `transition_issue` - Change issue status

**Capabilities:**
- Create new issues (all standard types)
- Update issue fields (summary, description, assignee, priority, labels)
- Update story points
- Transition issues between workflow states
- Dry-run mode for create and update
- ... and 1 more

[Full Documentation](./features/F006-jira-write/)

---

### F007: Git Integration

**Status:** Stable
**Package:** `@ximplicity/mcp-jira`
**Skills:** `jira-read, git-jira-integration`

Git-Jira integration for repository linking, branch name generation, and commit message validation.

**Tools:**
- `devflow_git_link_repo` - Link repository to Jira project
- `devflow_git_get_repos` - List linked repositories
- `devflow_git_branch_name` - Generate branch name from issue
- `devflow_git_validate_commit` - Validate commit message

**Capabilities:**
- Repository to project linking
- Branch name generation from issues
- Conventional commit validation
- Issue key extraction from commits
- Branch type inference from issue type
- ... and 1 more

[Full Documentation](./features/F007-git-integration/)

---

### F008: Pr Context

**Status:** Stable
**Package:** `@ximplicity/mcp-jira`
**Skills:** `jira-read, git-jira-integration, pr-creation`

Generate Pull Request context from Jira issues including titles, body templates, acceptance criteria, and testing checklists.

**Tools:**
- `devflow_git_pr_context` - Generate PR content from issues

**Capabilities:**
- PR title generation from issue(s)
- PR body template with:
- Label suggestions based on issue types
- Multi-issue PR support

[Full Documentation](./features/F008-pr-context/)

---

### F009: Board Sprint Management

**Status:** Stable
**Package:** `@ximplicity/mcp-jira`
**Skills:** `jira-read, jira-write`

Manage Jira boards and sprints including listing, querying, and moving issues between sprints with dry-run support.

**Tools:**
- `get_boards` - List Jira boards
- `get_board_sprints` - List sprints for a board
- `get_sprint` - Get sprint details with issues
- `move_issues_to_sprint` - Move issues to a sprint
- `update_sprint` - Update sprint properties

**Capabilities:**
- List boards (Scrum, Kanban, Simple)
- Filter boards by project, type, name
- List sprints for a board (future, active, closed)
- Get sprint details with issues
- Move issues to sprints
- ... and 3 more

[Full Documentation](./features/F009-board-sprint-management/)

---


*Generated: 2026-01-22*