# F005: Agent Instructions

## Overview

Instructions for implementing deep hierarchical analysis.

---

## Required Skills

| Skill | Path | Purpose |
|-------|------|---------|
| `jira-read` | `/skills/jira-read/SKILL.md` | Fetch issue hierarchies |

## Tools Touched

| Tool | Operation | Description |
|------|-----------|-------------|
| `jira_deep_analysis` | Read | Analyze issue hierarchy |

## Expected Outputs

- Hierarchical structure visualization
- Aggregated metrics (points, status)
- Anomaly list with severity
- Token-optimized for large hierarchies

---

## Prerequisites

Before starting:

1. Read and understand:
   - `/agents.md` (global rules)
   - `/skills/jira-read/SKILL.md`
   - F001 and F002 implementations

2. Verify:
   - Issue fetching works
   - JQL search works

## Implementation Steps

### Step 1: Create Analysis Types

**Location:** `packages/mcp-jira/src/analysis/types.ts`

Define:
- HierarchyNode
- AggregatedMetrics
- Anomaly
- DeepAnalysisResult

### Step 2: Implement Hierarchy Builder

**Location:** `packages/mcp-jira/src/analysis/hierarchy-builder.ts`

- Fetch children via JQL
- Build tree structure
- Handle depth limits

### Step 3: Implement Metrics Calculator

**Location:** `packages/mcp-jira/src/analysis/metrics-calculator.ts`

- Sum story points
- Calculate status distribution
- Compute completion percentage

### Step 4: Implement Anomaly Detector

**Location:** `packages/mcp-jira/src/analysis/anomaly-detector.ts`

- Check point mismatches
- Find unestimated items
- Identify stale items

### Step 5: Create Tool

**Location:** `packages/mcp-jira/src/tools/deep-analysis.ts`

- Orchestrate analysis components
- Format output based on mode

## Commit Strategy

```
feat(mcp-jira): add deep analysis types
feat(mcp-jira): implement hierarchy builder
feat(mcp-jira): add metrics calculator
feat(mcp-jira): implement anomaly detection
feat(mcp-jira): add jira_deep_analysis tool
```
