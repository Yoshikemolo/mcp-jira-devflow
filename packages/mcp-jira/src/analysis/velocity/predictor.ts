/**
 * Sprint Predictor
 *
 * Predicts sprint success probability and recommended load.
 */

import type { JiraIssue, SprintVelocityEntry } from "../../domain/types.js";
import type {
  SprintPrediction,
  SpilloverRisk,
  PredictionOptions,
  RiskLevel,
} from "./types.js";
import { analyzeTrend } from "./trend-analyzer.js";
import type { VelocityTrend } from "./types.js";

/**
 * Default prediction options.
 */
const DEFAULT_VELOCITY_SPRINT_COUNT = 5;
const DEFAULT_CONFIDENCE_LEVEL = 0.8;
const DEFAULT_BUFFER_PERCENTAGE = 0.1;

/**
 * Z-scores for different confidence levels.
 */
const CONFIDENCE_Z_SCORES: Record<number, number> = {
  0.9: 1.645,
  0.8: 1.28,
  0.7: 1.04,
};

/**
 * Risk score thresholds for classification.
 */
const RISK_THRESHOLDS = {
  LOW: 2,
  MEDIUM: 4,
  HIGH: 6,
};

/**
 * Trend factor adjustments for predictions.
 */
const TREND_FACTORS: Record<string, number> = {
  increasing: 1.05,
  stable: 1.0,
  decreasing: 0.95,
  volatile: 0.9,
};

/**
 * Calculates spillover risk for a single issue.
 */
export function calculateSpilloverRisk(
  issue: JiraIssue,
  daysInStatus: number = 0,
  hasExternalDependency: boolean = false,
  previousSpillovers: number = 0
): SpilloverRisk {
  const points = issue.storyPoints ?? 0;
  const riskFactors: string[] = [];

  // Size risk (larger items have higher variance)
  let sizeRisk = 0;
  if (points >= 13) {
    sizeRisk = 3;
    riskFactors.push("Very large story (13+ points) - consider splitting");
  } else if (points >= 8) {
    sizeRisk = 2;
    riskFactors.push("Large story (8 points) - higher variance");
  } else if (points >= 5) {
    sizeRisk = 1;
  }

  // Dependency risk
  let dependencyRisk = 0;
  if (hasExternalDependency) {
    dependencyRisk = 2;
    riskFactors.push("External dependency - completion depends on other team");
  }
  if (issue.status.categoryKey === "indeterminate" && daysInStatus > 2) {
    dependencyRisk += 1;
    riskFactors.push(`In progress for ${daysInStatus} days - may be blocked`);
  }

  // History risk (previous spillovers)
  let historyRisk = 0;
  if (previousSpillovers >= 2) {
    historyRisk = 2;
    riskFactors.push("Spilled over 2+ times - recurring issue");
  } else if (previousSpillovers === 1) {
    historyRisk = 1;
    riskFactors.push("Previously spilled over");
  }

  // Days in status risk
  if (daysInStatus > 5) {
    riskFactors.push(`Stale - in current status for ${daysInStatus} days`);
  }

  const riskScore = sizeRisk + dependencyRisk + historyRisk;

  let riskLevel: RiskLevel;
  if (riskScore >= RISK_THRESHOLDS.HIGH) {
    riskLevel = "critical";
  } else if (riskScore >= RISK_THRESHOLDS.MEDIUM) {
    riskLevel = "high";
  } else if (riskScore >= RISK_THRESHOLDS.LOW) {
    riskLevel = "medium";
  } else {
    riskLevel = "low";
  }

  return {
    issueKey: issue.key,
    summary: issue.summary,
    storyPoints: issue.storyPoints,
    riskScore,
    riskLevel,
    sizeRisk,
    dependencyRisk,
    historyRisk,
    daysInStatus,
    riskFactors,
  };
}

/**
 * Predicts velocity for the next sprint.
 */
export function predictVelocity(
  trend: VelocityTrend,
  options: PredictionOptions = {}
): {
  predicted: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
} {
  if (trend.sprintCount === 0) {
    return {
      predicted: 0,
      lowerBound: 0,
      upperBound: 0,
      confidence: 0,
    };
  }

  // Use weighted average as base prediction
  const trendFactor = TREND_FACTORS[trend.direction as keyof typeof TREND_FACTORS] ?? 1.0;
  const predicted = Math.round(trend.weightedAverage * trendFactor * 10) / 10;

  // Calculate prediction range
  const confidenceLevel = options.confidenceLevel !== undefined ? options.confidenceLevel : DEFAULT_CONFIDENCE_LEVEL;
  const zScore = CONFIDENCE_Z_SCORES[confidenceLevel] ?? 1.28;
  const margin = trend.standardDeviation * zScore;

  const lowerBound = Math.max(0, Math.round((predicted - margin) * 10) / 10);
  const upperBound = Math.round((predicted + margin) * 10) / 10;

  // Confidence based on trend stability
  const confidence = Math.round(trend.confidence * 100) / 100;

  return { predicted, lowerBound, upperBound, confidence };
}

/**
 * Calculates success probability for a sprint.
 */
export function calculateSuccessProbability(
  plannedLoad: number,
  predictedVelocity: number,
  trend: VelocityTrend,
  highRiskIssueCount: number = 0
): number {
  if (predictedVelocity === 0) return 0;

  // Base probability from load ratio
  const loadRatio = plannedLoad / predictedVelocity;
  let baseProbability: number;

  if (loadRatio <= 0.8) {
    baseProbability = 0.95;
  } else if (loadRatio <= 0.9) {
    baseProbability = 0.85;
  } else if (loadRatio <= 1.0) {
    baseProbability = 0.75;
  } else if (loadRatio <= 1.1) {
    baseProbability = 0.6;
  } else {
    baseProbability = 0.4;
  }

  // Adjustments based on trend
  let trendAdjustment = 0;
  switch (trend.direction) {
    case "increasing":
      trendAdjustment = 0.05;
      break;
    case "stable":
      trendAdjustment = 0;
      break;
    case "decreasing":
      trendAdjustment = -0.1;
      break;
    case "volatile":
      trendAdjustment = -0.15;
      break;
  }

  // Penalty for high-risk issues
  const riskPenalty = highRiskIssueCount * 0.05;

  // Penalty for low confidence in velocity data
  const confidencePenalty = trend.confidence < 0.5 ? 0.1 : 0;

  const probability = Math.max(
    0.1,
    Math.min(0.99, baseProbability + trendAdjustment - riskPenalty - confidencePenalty)
  );

  return Math.round(probability * 100) / 100;
}

/**
 * Generates sprint prediction with recommendations.
 */
export function predictSprint(
  velocitySprints: readonly SprintVelocityEntry[],
  plannedIssues?: readonly JiraIssue[],
  options: PredictionOptions = {}
): SprintPrediction {
  const velocitySprintCount = options.velocitySprintCount !== undefined ? options.velocitySprintCount : DEFAULT_VELOCITY_SPRINT_COUNT;

  // Analyze velocity trend
  const trend = analyzeTrend(velocitySprints, {
    sprintCount: velocitySprintCount,
  });

  // Predict velocity
  const { predicted, lowerBound, upperBound, confidence } = predictVelocity(
    trend,
    options
  );

  // Calculate recommended load with buffer
  const bufferPct = options.bufferPercentage !== undefined ? options.bufferPercentage : DEFAULT_BUFFER_PERCENTAGE;
  const recommendedLoad = Math.round(predicted * (1 - bufferPct) * 10) / 10;
  const maxSafeLoad = Math.round(predicted * 0.95 * 10) / 10;

  // Calculate planned load if issues provided
  let plannedLoad: number | undefined;
  let loadPercentage: number | undefined;
  let issueRisks: SpilloverRisk[] | undefined;

  if (plannedIssues && plannedIssues.length > 0) {
    plannedLoad = plannedIssues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
    loadPercentage = recommendedLoad > 0
      ? Math.round((plannedLoad / recommendedLoad) * 100)
      : 0;

    // Calculate risk for each issue
    issueRisks = plannedIssues.map((issue) =>
      calculateSpilloverRisk(issue, 0, false, 0)
    );
  }

  const highRiskCount = issueRisks?.filter((r) => r.riskLevel === "high" || r.riskLevel === "critical").length ?? 0;

  // Calculate success probability
  const successProbability = calculateSuccessProbability(
    plannedLoad ?? recommendedLoad,
    predicted,
    trend,
    highRiskCount
  );

  // Generate risk factors
  const riskFactors: string[] = [];

  if (trend.direction === "decreasing") {
    riskFactors.push("Velocity has been declining - historical trend may continue");
  }
  if (trend.direction === "volatile") {
    riskFactors.push("Velocity is unpredictable - expect higher variance");
  }
  if (trend.confidence < 0.5) {
    riskFactors.push("Limited historical data reduces prediction accuracy");
  }
  if (loadPercentage && loadPercentage > 100) {
    riskFactors.push(`Planned load (${loadPercentage}%) exceeds recommended capacity`);
  }
  if (highRiskCount > 0) {
    riskFactors.push(`${highRiskCount} high-risk issue(s) in sprint`);
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (loadPercentage && loadPercentage > 110) {
    recommendations.push("Consider removing lower-priority items to reduce overcommitment");
  }
  if (loadPercentage && loadPercentage < 70) {
    recommendations.push("Sprint may be undercommitted - consider adding more work");
  }
  if (highRiskCount > 2) {
    recommendations.push("Multiple high-risk items - consider distributing across sprints");
  }
  if (trend.direction === "volatile") {
    recommendations.push("Use conservative estimates due to velocity volatility");
  }
  if (successProbability < 0.7) {
    recommendations.push("Low success probability - review scope or address blockers");
  }
  if (successProbability >= 0.85) {
    recommendations.push("Good success probability - sprint plan looks achievable");
  }

  return {
    predictedVelocity: predicted,
    lowerBound,
    upperBound,
    successProbability,
    confidence,
    recommendedLoad,
    maxSafeLoad,
    plannedLoad,
    loadPercentage,
    issueRisks,
    riskFactors,
    recommendations,
  };
}

/**
 * Gets risk level description.
 */
export function getRiskLevelDescription(level: RiskLevel): string {
  switch (level) {
    case "critical":
      return "Critical risk - high probability of spillover";
    case "high":
      return "High risk - intervention recommended";
    case "medium":
      return "Medium risk - monitor closely";
    case "low":
      return "Low risk - standard monitoring";
  }
}
