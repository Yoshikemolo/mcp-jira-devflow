/**
 * Velocity Analysis Types
 *
 * Type definitions for velocity analysis, trend detection, and predictions.
 */

import type { SprintVelocityEntry } from "../../domain/types.js";

/**
 * Direction of velocity trend.
 */
export type TrendDirection = "increasing" | "stable" | "decreasing" | "volatile";

/**
 * Velocity trend analysis result.
 */
export interface VelocityTrend {
  /** The direction of the velocity trend */
  readonly direction: TrendDirection;
  /** Linear regression slope value */
  readonly slope: number;
  /** Average velocity across analyzed sprints */
  readonly average: number;
  /** Weighted average (recent sprints weighted higher) */
  readonly weightedAverage: number;
  /** Standard deviation of velocity */
  readonly standardDeviation: number;
  /** Coefficient of variation (σ/μ × 100) */
  readonly varianceCoefficient: number;
  /** Confidence level based on data stability (0-1) */
  readonly confidence: number;
  /** Number of sprints analyzed */
  readonly sprintCount: number;
  /** Raw velocity values per sprint */
  readonly velocities: readonly number[];
}

/**
 * Risk level classification.
 */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/**
 * Spillover risk assessment for an issue.
 */
export interface SpilloverRisk {
  /** Issue key */
  readonly issueKey: string;
  /** Issue summary */
  readonly summary: string;
  /** Story points */
  readonly storyPoints: number | undefined;
  /** Overall risk score (0-10) */
  readonly riskScore: number;
  /** Risk level classification */
  readonly riskLevel: RiskLevel;
  /** Size contribution to risk */
  readonly sizeRisk: number;
  /** Dependency contribution to risk */
  readonly dependencyRisk: number;
  /** History contribution to risk (previous spillovers) */
  readonly historyRisk: number;
  /** Days in current status */
  readonly daysInStatus: number;
  /** Risk factors descriptions */
  readonly riskFactors: readonly string[];
}

/**
 * Sprint success prediction result.
 */
export interface SprintPrediction {
  /** Predicted velocity for the sprint */
  readonly predictedVelocity: number;
  /** Lower bound of prediction (80% confidence) */
  readonly lowerBound: number;
  /** Upper bound of prediction (80% confidence) */
  readonly upperBound: number;
  /** Success probability (0-1) */
  readonly successProbability: number;
  /** Confidence in the prediction (0-1) */
  readonly confidence: number;
  /** Recommended sprint load based on analysis */
  readonly recommendedLoad: number;
  /** Maximum safe load */
  readonly maxSafeLoad: number;
  /** Current planned load (if sprint provided) */
  readonly plannedLoad?: number | undefined;
  /** Load percentage vs recommended */
  readonly loadPercentage?: number | undefined;
  /** Risk assessment per issue */
  readonly issueRisks?: readonly SpilloverRisk[] | undefined;
  /** Overall sprint risk factors */
  readonly riskFactors: readonly string[];
  /** Recommended actions */
  readonly recommendations: readonly string[];
}

/**
 * Team member availability.
 */
export interface TeamMemberAvailability {
  /** Account ID or name */
  readonly memberId: string;
  /** Display name */
  readonly displayName: string;
  /** Available days in sprint */
  readonly availableDays: number;
  /** Availability factor (0-1, where 1 is full time) */
  readonly availabilityFactor: number;
  /** Effective capacity in person-days */
  readonly effectiveCapacity: number;
}

/**
 * Capacity forecast result.
 */
export interface CapacityForecast {
  /** Sprint being forecasted */
  readonly sprintId?: number | undefined;
  readonly sprintName?: string | undefined;
  /** Sprint duration in days */
  readonly sprintDays: number;
  /** Total team capacity in person-days */
  readonly totalCapacity: number;
  /** Effective capacity after meetings overhead */
  readonly effectiveCapacity: number;
  /** Meeting overhead percentage (0-1) */
  readonly meetingOverhead: number;
  /** Recommended buffer percentage (0-1) */
  readonly recommendedBuffer: number;
  /** Points that can be safely committed */
  readonly recommendedPoints: number;
  /** Maximum points (aggressive planning) */
  readonly maxPoints: number;
  /** Team member breakdown (if available) */
  readonly memberCapacity?: readonly TeamMemberAvailability[] | undefined;
  /** Historical points per person-day ratio */
  readonly pointsPerPersonDay: number;
  /** Confidence in the forecast (0-1) */
  readonly confidence: number;
  /** Factors affecting capacity */
  readonly factors: readonly string[];
}

/**
 * Options for velocity trend analysis.
 */
export interface TrendAnalysisOptions {
  /** Number of sprints to analyze */
  readonly sprintCount?: number | undefined;
  /** Minimum sprints required for trend (default: 3) */
  readonly minSprints?: number | undefined;
}

/**
 * Options for sprint prediction.
 */
export interface PredictionOptions {
  /** Number of sprints for velocity analysis */
  readonly velocitySprintCount?: number | undefined;
  /** Confidence level for prediction range (default: 0.8) */
  readonly confidenceLevel?: number | undefined;
  /** Buffer percentage for recommendations (default: 0.1) */
  readonly bufferPercentage?: number | undefined;
}

/**
 * Options for capacity forecasting.
 */
export interface CapacityOptions {
  /** Sprint duration in days (default: 10) */
  readonly sprintDays?: number | undefined;
  /** Meeting overhead percentage (default: 0.15) */
  readonly meetingOverhead?: number | undefined;
  /** Buffer percentage (default: 0.1) */
  readonly bufferPercentage?: number | undefined;
  /** Historical sprints for points/day calculation */
  readonly velocitySprints?: readonly SprintVelocityEntry[] | undefined;
}

/**
 * Sprint planning recommendation.
 */
export interface SprintPlanRecommendation {
  /** Recommended issues to include */
  readonly includedIssues: readonly string[];
  /** Issues to consider removing */
  readonly atRiskIssues: readonly string[];
  /** Total points of included issues */
  readonly totalPoints: number;
  /** Load percentage vs capacity */
  readonly loadPercentage: number;
  /** Overall risk level */
  readonly riskLevel: RiskLevel;
  /** Predicted success rate */
  readonly successProbability: number;
  /** Sprint goal suggestion (if not set) */
  readonly goalSuggestion?: string | undefined;
  /** Actionable recommendations */
  readonly recommendations: readonly string[];
}
