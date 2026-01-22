/**
 * Velocity Analysis Module
 *
 * Provides velocity trend analysis, sprint prediction, and capacity forecasting.
 */

// Types
export type {
  TrendDirection,
  VelocityTrend,
  RiskLevel,
  SpilloverRisk,
  SprintPrediction,
  TeamMemberAvailability,
  CapacityForecast,
  TrendAnalysisOptions,
  PredictionOptions,
  CapacityOptions,
  SprintPlanRecommendation,
} from "./types.js";

// Trend Analyzer
export {
  analyzeTrend,
  getTrendDescription,
  hasConcerningTrend,
  getTrendRecommendations,
} from "./trend-analyzer.js";

// Predictor
export {
  calculateSpilloverRisk,
  predictVelocity,
  calculateSuccessProbability,
  predictSprint,
  getRiskLevelDescription,
} from "./predictor.js";

// Capacity Forecaster
export {
  forecastCapacity,
  forecastSprintCapacity,
  getSeasonalAdjustment,
  getTeamChangeAdjustment,
  getCapacitySummary,
} from "./capacity.js";
