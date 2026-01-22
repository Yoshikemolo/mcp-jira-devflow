/**
 * CI/CD Integration Module
 *
 * Deployment tracking and release status monitoring.
 */

// Types
export type {
  DeploymentEnvironment,
  DeploymentStatus,
  DeploymentInfo,
  IssueDeployment,
  ReleaseProgress,
  EnvironmentStatus,
  ReleaseStatus,
  DeploymentTrackingOptions,
  DeploymentLinkInput,
  DeploymentLinkResult,
} from "./types.js";

// Deployment Tracker
export {
  recordDeployment,
  getIssueDeployments,
  getIssueEnvironmentStatus,
  calculateReleaseProgress,
  getReleaseStatus,
  getDeploymentTimeline,
  getDeploymentHealth,
} from "./deployment-tracker.js";
