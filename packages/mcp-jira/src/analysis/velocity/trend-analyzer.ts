/**
 * Velocity Trend Analyzer
 *
 * Analyzes historical sprint velocity to detect trends and patterns.
 */

import type { SprintVelocityEntry } from "../../domain/types.js";
import type { VelocityTrend, TrendDirection, TrendAnalysisOptions } from "./types.js";

/**
 * Default options for trend analysis.
 */
const DEFAULT_SPRINT_COUNT = 5;
const DEFAULT_MIN_SPRINTS = 3;

/**
 * Trend slope thresholds for direction classification.
 */
const TREND_THRESHOLDS = {
  SIGNIFICANT_INCREASE: 2,
  SIGNIFICANT_DECREASE: -2,
  VOLATILE_CV: 30, // Coefficient of variation percentage
};

/**
 * Calculates the mean of an array of numbers.
 */
function calculateMean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculates the standard deviation of an array of numbers.
 */
function calculateStandardDeviation(values: readonly number[], mean: number): number {
  if (values.length < 2) return 0;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length);
}

/**
 * Calculates the linear regression slope.
 * Uses least squares method.
 */
function calculateSlope(values: readonly number[]): number {
  if (values.length < 2) return 0;

  const n = values.length;
  const xMean = (n - 1) / 2; // Indices 0, 1, 2... -> mean = (n-1)/2
  const yMean = calculateMean(values);

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = i - xMean;
    const yDiff = (values[i] ?? 0) - yMean;
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculates weighted average with recent sprints weighted higher.
 * Weights: oldest=1, next=2, ..., newest=n
 */
function calculateWeightedAverage(values: readonly number[]): number {
  if (values.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  // Values are assumed to be oldest to newest
  for (let i = 0; i < values.length; i++) {
    const weight = i + 1;
    weightedSum += (values[i] ?? 0) * weight;
    totalWeight += weight;
  }

  return weightedSum / totalWeight;
}

/**
 * Determines trend direction based on slope and variance.
 */
function determineTrendDirection(
  slope: number,
  varianceCoefficient: number
): TrendDirection {
  // High variance indicates volatility regardless of slope
  if (varianceCoefficient > TREND_THRESHOLDS.VOLATILE_CV) {
    return "volatile";
  }

  if (slope > TREND_THRESHOLDS.SIGNIFICANT_INCREASE) {
    return "increasing";
  }

  if (slope < TREND_THRESHOLDS.SIGNIFICANT_DECREASE) {
    return "decreasing";
  }

  return "stable";
}

/**
 * Calculates confidence level based on data stability.
 * Higher confidence with more data and lower variance.
 */
function calculateConfidence(
  sprintCount: number,
  varianceCoefficient: number,
  minSprints: number
): number {
  // Base confidence from data quantity
  const dataConfidence = Math.min(1, sprintCount / 7); // Max at 7 sprints

  // Penalty for high variance
  const variancePenalty = Math.max(0, 1 - varianceCoefficient / 50);

  // Penalty if below minimum sprints
  const minPenalty = sprintCount >= minSprints ? 1 : 0.5;

  return Math.round(dataConfidence * variancePenalty * minPenalty * 100) / 100;
}

/**
 * Analyzes velocity trend from sprint history.
 *
 * @param sprints - Sprint velocity entries (should be sorted oldest to newest)
 * @param options - Analysis options
 * @returns Velocity trend analysis result
 */
export function analyzeTrend(
  sprints: readonly SprintVelocityEntry[],
  options: TrendAnalysisOptions = {}
): VelocityTrend {
  const sprintCount = options.sprintCount !== undefined ? options.sprintCount : DEFAULT_SPRINT_COUNT;
  const minSprints = options.minSprints !== undefined ? options.minSprints : DEFAULT_MIN_SPRINTS;

  // Take the most recent N sprints
  const recentSprints = sprints.slice(-sprintCount);

  // Extract velocity values (completed points)
  const velocities = recentSprints.map((s) => s.completedPoints);

  if (velocities.length === 0) {
    return {
      direction: "stable",
      slope: 0,
      average: 0,
      weightedAverage: 0,
      standardDeviation: 0,
      varianceCoefficient: 0,
      confidence: 0,
      sprintCount: 0,
      velocities: [],
    };
  }

  const average = calculateMean(velocities);
  const weightedAverage = calculateWeightedAverage(velocities);
  const standardDeviation = calculateStandardDeviation(velocities, average);
  const varianceCoefficient = average > 0 ? (standardDeviation / average) * 100 : 0;
  const slope = calculateSlope(velocities);
  const direction = determineTrendDirection(slope, varianceCoefficient);
  const confidence = calculateConfidence(velocities.length, varianceCoefficient, minSprints);

  return {
    direction,
    slope: Math.round(slope * 100) / 100,
    average: Math.round(average * 10) / 10,
    weightedAverage: Math.round(weightedAverage * 10) / 10,
    standardDeviation: Math.round(standardDeviation * 10) / 10,
    varianceCoefficient: Math.round(varianceCoefficient * 10) / 10,
    confidence,
    sprintCount: velocities.length,
    velocities,
  };
}

/**
 * Gets trend description for display.
 */
export function getTrendDescription(trend: VelocityTrend): string {
  const { direction, average, slope, confidence } = trend;

  const confidenceText =
    confidence >= 0.8 ? "high confidence" :
    confidence >= 0.5 ? "moderate confidence" :
    "low confidence";

  switch (direction) {
    case "increasing":
      return `Velocity increasing by ~${Math.abs(slope).toFixed(1)} points/sprint (avg: ${average}, ${confidenceText})`;
    case "decreasing":
      return `Velocity decreasing by ~${Math.abs(slope).toFixed(1)} points/sprint (avg: ${average}, ${confidenceText})`;
    case "volatile":
      return `Velocity is volatile with high variance (avg: ${average}, CV: ${trend.varianceCoefficient.toFixed(1)}%)`;
    case "stable":
    default:
      return `Velocity is stable at ~${average} points/sprint (${confidenceText})`;
  }
}

/**
 * Checks if velocity trend indicates a concerning pattern.
 */
export function hasConcerningTrend(trend: VelocityTrend): boolean {
  return (
    trend.direction === "decreasing" ||
    trend.direction === "volatile" ||
    trend.confidence < 0.5
  );
}

/**
 * Gets recommendations based on trend analysis.
 */
export function getTrendRecommendations(trend: VelocityTrend): readonly string[] {
  const recommendations: string[] = [];

  if (trend.sprintCount < 3) {
    recommendations.push("Collect more sprint data for reliable predictions (minimum 3 sprints)");
  }

  switch (trend.direction) {
    case "decreasing":
      recommendations.push("Investigate root cause of declining velocity");
      recommendations.push("Consider reducing sprint commitment until velocity stabilizes");
      recommendations.push("Review recent retrospectives for recurring impediments");
      break;

    case "volatile":
      recommendations.push("High velocity variance reduces prediction accuracy");
      recommendations.push("Use conservative planning buffer (20-30%)");
      recommendations.push("Investigate causes of sprint-to-sprint variation");
      break;

    case "increasing":
      recommendations.push("Team velocity is improving - maintain current practices");
      recommendations.push("Consider slightly increasing sprint commitment");
      break;

    case "stable":
      if (trend.confidence >= 0.7) {
        recommendations.push("Stable velocity allows for confident sprint planning");
      }
      break;
  }

  if (trend.varianceCoefficient > 20) {
    recommendations.push("Consider improving estimation practices to reduce variance");
  }

  return recommendations;
}
