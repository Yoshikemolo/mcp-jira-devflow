/**
 * Risk Calculator
 *
 * Calculates cascade impact and risk levels for dependency nodes.
 */

import type {
  DependencyNode,
  DependencyEdge,
  CascadeRisk,
  DependencyRiskLevel,
} from "./types.js";

/**
 * Thresholds for risk level classification.
 */
const RISK_THRESHOLDS = {
  CRITICAL_BLOCKED: 10,
  HIGH_BLOCKED: 5,
  MEDIUM_BLOCKED: 2,
  CRITICAL_POINTS: 50,
  HIGH_POINTS: 20,
  MEDIUM_POINTS: 10,
};

/**
 * Calculates cascade risks for all nodes in the graph.
 *
 * For each node, calculates how many other nodes would be affected
 * if this node is delayed or blocked.
 */
export function calculateCascadeRisks(
  nodes: Map<string, DependencyNode>,
  edges: readonly DependencyEdge[]
): CascadeRisk[] {
  const risks: CascadeRisk[] = [];

  // Build reverse adjacency (who blocks whom)
  // Edge from A to B where type is "blocks" means A blocks B
  // We want to find: for each node, who is blocked by it?
  const blocksAdjacency = new Map<string, Set<string>>();

  for (const edge of edges) {
    if (!edge.isBlocking) continue;

    // Determine the actual blocking direction
    const blocker = edge.type.includes("is blocked") ? edge.to : edge.from;
    const blocked = edge.type.includes("is blocked") ? edge.from : edge.to;

    if (!blocksAdjacency.has(blocker)) {
      blocksAdjacency.set(blocker, new Set());
    }
    blocksAdjacency.get(blocker)!.add(blocked);
  }

  // For each node that blocks others, calculate cascade impact
  for (const [issueKey, node] of nodes) {
    // Skip nodes that are already done
    if (node.statusCategory === "done") {
      continue;
    }

    const directlyBlocked = blocksAdjacency.get(issueKey);
    if (!directlyBlocked || directlyBlocked.size === 0) {
      // This node doesn't block anything
      continue;
    }

    // BFS to find all transitively blocked nodes
    const transitivelyBlocked = new Set<string>();
    const queue = [...directlyBlocked];
    const visited = new Set<string>([issueKey]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      transitivelyBlocked.add(current);

      // Add nodes blocked by current
      const blockedByCurrent = blocksAdjacency.get(current);
      if (blockedByCurrent) {
        for (const blocked of blockedByCurrent) {
          if (!visited.has(blocked)) {
            queue.push(blocked);
          }
        }
      }
    }

    // Calculate points at risk
    let pointsAtRisk = 0;
    const affectedIssues: string[] = [];

    for (const blocked of transitivelyBlocked) {
      const blockedNode = nodes.get(blocked);
      if (blockedNode) {
        pointsAtRisk += blockedNode.storyPoints ?? 0;
        affectedIssues.push(blocked);
      }
    }

    // Determine risk level
    const riskLevel = calculateRiskLevel(
      transitivelyBlocked.size,
      pointsAtRisk
    );

    if (transitivelyBlocked.size > 0) {
      risks.push({
        issueKey,
        directlyBlocked: directlyBlocked.size,
        transitivelyBlocked: transitivelyBlocked.size,
        pointsAtRisk,
        riskLevel,
        affectedIssues,
      });
    }
  }

  // Sort by risk level and transitive impact
  return risks.sort((a, b) => {
    const levelOrder: Record<DependencyRiskLevel, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    const levelDiff = levelOrder[a.riskLevel] - levelOrder[b.riskLevel];
    if (levelDiff !== 0) return levelDiff;
    return b.transitivelyBlocked - a.transitivelyBlocked;
  });
}

/**
 * Determines risk level based on impact.
 */
function calculateRiskLevel(
  blockedCount: number,
  pointsAtRisk: number
): DependencyRiskLevel {
  // Critical if either threshold is exceeded
  if (
    blockedCount >= RISK_THRESHOLDS.CRITICAL_BLOCKED ||
    pointsAtRisk >= RISK_THRESHOLDS.CRITICAL_POINTS
  ) {
    return "critical";
  }

  // High if either high threshold is exceeded
  if (
    blockedCount >= RISK_THRESHOLDS.HIGH_BLOCKED ||
    pointsAtRisk >= RISK_THRESHOLDS.HIGH_POINTS
  ) {
    return "high";
  }

  // Medium if either medium threshold is exceeded
  if (
    blockedCount >= RISK_THRESHOLDS.MEDIUM_BLOCKED ||
    pointsAtRisk >= RISK_THRESHOLDS.MEDIUM_POINTS
  ) {
    return "medium";
  }

  return "low";
}

/**
 * Gets the total risk score for a project based on all cascade risks.
 */
export function getProjectRiskScore(risks: readonly CascadeRisk[]): {
  score: number;
  level: DependencyRiskLevel;
  description: string;
} {
  if (risks.length === 0) {
    return {
      score: 0,
      level: "low",
      description: "No significant dependency risks detected",
    };
  }

  // Weight risks by level
  const weights: Record<DependencyRiskLevel, number> = {
    critical: 10,
    high: 5,
    medium: 2,
    low: 1,
  };

  const totalScore = risks.reduce(
    (sum, risk) => sum + weights[risk.riskLevel] * risk.transitivelyBlocked,
    0
  );

  // Normalize to 0-100 scale
  const normalizedScore = Math.min(100, totalScore);

  let level: DependencyRiskLevel;
  let description: string;

  if (normalizedScore >= 50) {
    level = "critical";
    description = "Critical dependency risk - multiple blocking chains need attention";
  } else if (normalizedScore >= 25) {
    level = "high";
    description = "High dependency risk - review blocking relationships";
  } else if (normalizedScore >= 10) {
    level = "medium";
    description = "Moderate dependency risk - monitor key blockers";
  } else {
    level = "low";
    description = "Low dependency risk - dependencies are well managed";
  }

  return { score: normalizedScore, level, description };
}

/**
 * Gets recommendations for reducing cascade risk.
 */
export function getRiskRecommendations(
  risks: readonly CascadeRisk[]
): string[] {
  const recommendations: string[] = [];

  const criticalRisks = risks.filter((r) => r.riskLevel === "critical");
  const highRisks = risks.filter((r) => r.riskLevel === "high");

  if (criticalRisks.length > 0) {
    recommendations.push(
      `${criticalRisks.length} critical blocker(s) detected - prioritize immediate resolution`
    );

    for (const risk of criticalRisks.slice(0, 3)) {
      recommendations.push(
        `  - ${risk.issueKey} blocks ${risk.transitivelyBlocked} issue(s) (${risk.pointsAtRisk} points at risk)`
      );
    }
  }

  if (highRisks.length > 0) {
    recommendations.push(
      `${highRisks.length} high-risk blocker(s) should be addressed soon`
    );
  }

  // General recommendations based on patterns
  const totalBlocked = risks.reduce(
    (sum, r) => sum + r.transitivelyBlocked,
    0
  );

  if (totalBlocked > 20) {
    recommendations.push(
      "Consider breaking down large dependent work into smaller parallel tracks"
    );
  }

  const longChains = risks.filter((r) => r.transitivelyBlocked > 5);
  if (longChains.length > 0) {
    recommendations.push(
      "Long dependency chains detected - review if all blocking relationships are necessary"
    );
  }

  return recommendations;
}

/**
 * Identifies the most impactful nodes to unblock.
 * Returns nodes that, if completed, would unblock the most work.
 */
export function getUnblockPriorities(
  risks: readonly CascadeRisk[],
  topN: number = 5
): Array<{
  issueKey: string;
  impact: number;
  pointsUnblocked: number;
  recommendation: string;
}> {
  return risks
    .filter((r) => r.riskLevel !== "low")
    .slice(0, topN)
    .map((risk) => ({
      issueKey: risk.issueKey,
      impact: risk.transitivelyBlocked,
      pointsUnblocked: risk.pointsAtRisk,
      recommendation:
        risk.riskLevel === "critical"
          ? "Immediate attention required - critical blocker"
          : risk.riskLevel === "high"
            ? "High priority - blocks significant work"
            : "Should be addressed to reduce risk",
    }));
}
