# Features Index

> Structured index for AI agents. Auto-generated from features directory.

## Quick Reference

```yaml
features:
  F001:
    name: "F001-jira-read"
    status: "Implemented"
    path: "features/F001-jira-read/"
    tools: ["get_issue", "search_jql", "get_issue_comments", "get_issue_changelog"]
    skills: ["jira-read"]
  F002:
    name: "F002-scrum-guidance"
    status: "Stable"
    path: "features/F002-scrum-guidance/"
    tools: ["jira_scrum_guidance"]
    skills: ["jira-read"]
  F004:
    name: "F004-sprint-velocity"
    status: "Stable"
    path: "features/F004-sprint-velocity/"
    tools: ["get_sprint_velocity"]
    skills: ["jira-read"]
  F005:
    name: "F005-deep-analysis"
    status: "Stable"
    path: "features/F005-deep-analysis/"
    tools: ["jira_deep_analysis"]
    skills: ["jira-read"]
  F006:
    name: "F006-jira-write"
    status: "Stable"
    path: "features/F006-jira-write/"
    tools: ["create_issue", "update_issue", "transition_issue"]
    skills: ["jira-read, jira-write"]
  F007:
    name: "F007-git-integration"
    status: "Stable"
    path: "features/F007-git-integration/"
    tools: ["devflow_git_link_repo", "devflow_git_get_repos", "devflow_git_branch_name", "devflow_git_validate_commit"]
    skills: ["jira-read, git-jira-integration"]
  F008:
    name: "F008-pr-context"
    status: "Stable"
    path: "features/F008-pr-context/"
    tools: ["devflow_git_pr_context"]
    skills: ["jira-read, git-jira-integration, pr-creation"]
  F009:
    name: "F009-board-sprint-management"
    status: "Stable"
    path: "features/F009-board-sprint-management/"
    tools: ["get_boards", "get_board_sprints", "get_sprint", "move_issues_to_sprint", "update_sprint"]
    skills: ["jira-read, jira-write"]
```

## Feature Documents

### F001

| Document | Purpose | Path |
|----------|---------|------|
| README.md | Overview and quick reference | features/F001-jira-read/README.md |
| scope.md | Feature boundaries and dependencies | features/F001-jira-read/scope.md |
| acceptance-criteria.md | Definition of Done | features/F001-jira-read/acceptance-criteria.md |
| agent-instructions.md | Implementation guide | features/F001-jira-read/agent-instructions.md |
| tool-contracts.md | Tool input/output specifications | features/F001-jira-read/tool-contracts.md |

### F002

| Document | Purpose | Path |
|----------|---------|------|
| README.md | Overview and quick reference | features/F002-scrum-guidance/README.md |
| scope.md | Feature boundaries and dependencies | features/F002-scrum-guidance/scope.md |
| acceptance-criteria.md | Definition of Done | features/F002-scrum-guidance/acceptance-criteria.md |
| agent-instructions.md | Implementation guide | features/F002-scrum-guidance/agent-instructions.md |
| tool-contracts.md | Tool input/output specifications | features/F002-scrum-guidance/tool-contracts.md |

### F004

| Document | Purpose | Path |
|----------|---------|------|
| README.md | Overview and quick reference | features/F004-sprint-velocity/README.md |
| scope.md | Feature boundaries and dependencies | features/F004-sprint-velocity/scope.md |
| acceptance-criteria.md | Definition of Done | features/F004-sprint-velocity/acceptance-criteria.md |
| agent-instructions.md | Implementation guide | features/F004-sprint-velocity/agent-instructions.md |
| tool-contracts.md | Tool input/output specifications | features/F004-sprint-velocity/tool-contracts.md |

### F005

| Document | Purpose | Path |
|----------|---------|------|
| README.md | Overview and quick reference | features/F005-deep-analysis/README.md |
| scope.md | Feature boundaries and dependencies | features/F005-deep-analysis/scope.md |
| acceptance-criteria.md | Definition of Done | features/F005-deep-analysis/acceptance-criteria.md |
| agent-instructions.md | Implementation guide | features/F005-deep-analysis/agent-instructions.md |
| tool-contracts.md | Tool input/output specifications | features/F005-deep-analysis/tool-contracts.md |

### F006

| Document | Purpose | Path |
|----------|---------|------|
| README.md | Overview and quick reference | features/F006-jira-write/README.md |
| scope.md | Feature boundaries and dependencies | features/F006-jira-write/scope.md |
| acceptance-criteria.md | Definition of Done | features/F006-jira-write/acceptance-criteria.md |
| agent-instructions.md | Implementation guide | features/F006-jira-write/agent-instructions.md |
| tool-contracts.md | Tool input/output specifications | features/F006-jira-write/tool-contracts.md |

### F007

| Document | Purpose | Path |
|----------|---------|------|
| README.md | Overview and quick reference | features/F007-git-integration/README.md |
| scope.md | Feature boundaries and dependencies | features/F007-git-integration/scope.md |
| acceptance-criteria.md | Definition of Done | features/F007-git-integration/acceptance-criteria.md |
| agent-instructions.md | Implementation guide | features/F007-git-integration/agent-instructions.md |
| tool-contracts.md | Tool input/output specifications | features/F007-git-integration/tool-contracts.md |

### F008

| Document | Purpose | Path |
|----------|---------|------|
| README.md | Overview and quick reference | features/F008-pr-context/README.md |
| scope.md | Feature boundaries and dependencies | features/F008-pr-context/scope.md |
| acceptance-criteria.md | Definition of Done | features/F008-pr-context/acceptance-criteria.md |
| agent-instructions.md | Implementation guide | features/F008-pr-context/agent-instructions.md |
| tool-contracts.md | Tool input/output specifications | features/F008-pr-context/tool-contracts.md |

### F009

| Document | Purpose | Path |
|----------|---------|------|
| README.md | Overview and quick reference | features/F009-board-sprint-management/README.md |
| scope.md | Feature boundaries and dependencies | features/F009-board-sprint-management/scope.md |
| acceptance-criteria.md | Definition of Done | features/F009-board-sprint-management/acceptance-criteria.md |
| agent-instructions.md | Implementation guide | features/F009-board-sprint-management/agent-instructions.md |
| tool-contracts.md | Tool input/output specifications | features/F009-board-sprint-management/tool-contracts.md |

## Tools by Feature

| Tool | Feature | Operation |
|------|---------|-----------|
| `get_issue` | F001 | Retrieve single issue by key |
| `search_jql` | F001 | Search issues using JQL queries |
| `get_issue_comments` | F001 | Get comments for an issue |
| `get_issue_changelog` | F001 | Get change history for an issue |
| `jira_scrum_guidance` | F002 | Analyze issue for Scrum compliance |
| `get_sprint_velocity` | F004 | Calculate velocity metrics for closed sprints |
| `jira_deep_analysis` | F005 | Analyze issue hierarchy with metrics and anomalies |
| `create_issue` | F006 | Create new issues |
| `update_issue` | F006 | Update existing issues |
| `transition_issue` | F006 | Change issue status |
| `devflow_git_link_repo` | F007 | Link repository to Jira project |
| `devflow_git_get_repos` | F007 | List linked repositories |
| `devflow_git_branch_name` | F007 | Generate branch name from issue |
| `devflow_git_validate_commit` | F007 | Validate commit message |
| `devflow_git_pr_context` | F008 | Generate PR content from issues |
| `get_boards` | F009 | List Jira boards |
| `get_board_sprints` | F009 | List sprints for a board |
| `get_sprint` | F009 | Get sprint details with issues |
| `move_issues_to_sprint` | F009 | Move issues to a sprint |
| `update_sprint` | F009 | Update sprint properties |

*Generated: 2026-01-22*