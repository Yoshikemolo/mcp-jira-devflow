---
name: devflow-planning
description: "Analyze sprint velocity, forecast team capacity, and plan sprints using Jira data. Use when the user asks about story points, backlog grooming, burndown trends, sprint capacity, team velocity, or needs agile planning recommendations."
license: MIT
compatibility: Requires mcp-jira with configured Jira instance
metadata:
  author: ximplicity
  version: "1.0"
  category: planning
---

# DevFlow Planning Skill

Sprint planning, velocity analysis, and capacity forecasting for agile teams using Jira project data.

## Allowed Operations

- Analyze sprint velocity and trends
- Generate capacity forecasts
- Predict sprint success probability
- Recommend optimal sprint load
- Identify spillover risks
- Cross-project dependency mapping
- Generate documentation from issues
- Compile release notes

## Forbidden Operations

These require explicit user approval:

- Auto-commit sprint changes
- Modify issue estimates without review
- Move issues to sprints automatically
- Create issues from predictions

## Sprint Planning Workflow

1. **Fetch velocity data** → Query completed sprints via Jira (minimum 3 sprints for reliable forecasts)
2. **Calculate capacity** → `Team Capacity = Sum(member availability × sprint days)`; apply buffer: `Recommended Load = Avg Velocity × (1 - Buffer%)`
3. **Recommend load** → Compare proposed scope against recommended load; flag if over threshold
4. **Assess risks** → Check each issue for: missing estimates, blocked status >2 days, cross-project dependencies
5. **Validate plan** → Confirm coverage ≤ recommended load; present sprint success probability to user before committing

Buffer guidelines: Stable team 10%, new members 20%, high uncertainty 30%.

## Quick Velocity Reference

| Metric | Use For |
|--------|---------|
| Avg Velocity (points/sprint) | Baseline planning |
| Trend Direction | Adjust forecasts up/down |
| Completion Rate (done/committed) | Risk assessment |
| Variance (sprint-to-sprint) | Confidence levels |

For complete velocity patterns, see [VELOCITY-PATTERNS.md](references/VELOCITY-PATTERNS.md).

For sprint planning details, see [SPRINT-PLANNING-GUIDE.md](references/SPRINT-PLANNING-GUIDE.md).

## Proactive Recommendations

| Context | Trigger | Action |
|---------|---------|--------|
| Sprint >80% filled | Overcommit risk | Suggest scope reduction |
| Velocity declining 3+ sprints | Trend alert | Recommend retrospective focus |
| Issue blocked >2 days | Dependency risk | Escalate blocker |
| Unestimated work in sprint | Planning gap | Flag for refinement |
| Branch stale >5 days | GitFlow alert | Review or close |

## GitFlow Integration

When planning work: feature branches from `develop`, naming `feature/<issue-key>-<description>`, one issue per branch, complete sprint items before merge.

For GitFlow details, see [GITFLOW-RECOMMENDATIONS.md](references/GITFLOW-RECOMMENDATIONS.md).

For Scrum patterns, see [SCRUM-BEST-PRACTICES.md](references/SCRUM-BEST-PRACTICES.md).
