/**
 * CI/CD Integration Types
 *
 * Type definitions for deployment tracking and release status.
 */

/**
 * Deployment environment.
 */
export type DeploymentEnvironment = "development" | "staging" | "production" | "preview" | "qa";

/**
 * Deployment status.
 */
export type DeploymentStatus = "pending" | "in_progress" | "success" | "failed" | "rolled_back";

/**
 * Deployment information.
 */
export interface DeploymentInfo {
  /** Unique deployment ID */
  readonly deploymentId: string;
  /** Environment deployed to */
  readonly environment: DeploymentEnvironment;
  /** Deployment status */
  readonly status: DeploymentStatus;
  /** Deployment timestamp */
  readonly deployedAt: string;
  /** Version/tag deployed */
  readonly version: string;
  /** Commit SHA */
  readonly commitSha?: string | undefined;
  /** Branch name */
  readonly branch?: string | undefined;
  /** Deployer (user or system) */
  readonly deployedBy?: string | undefined;
  /** Deployment URL */
  readonly url?: string | undefined;
  /** Duration in seconds */
  readonly duration?: number | undefined;
}

/**
 * Issue deployment record.
 */
export interface IssueDeployment {
  /** Issue key */
  readonly issueKey: string;
  /** Issue summary */
  readonly summary: string;
  /** Deployment info */
  readonly deployment: DeploymentInfo;
  /** First deployed at */
  readonly firstDeployedAt: string;
  /** Is this the latest deployment for this issue */
  readonly isLatest: boolean;
}

/**
 * Release progress across environments.
 */
export interface ReleaseProgress {
  /** Version being released */
  readonly version: string;
  /** Total issues in release */
  readonly totalIssues: number;
  /** Environments and their status */
  readonly environments: readonly EnvironmentStatus[];
  /** Issues not yet deployed anywhere */
  readonly pendingIssues: readonly string[];
  /** Overall progress percentage */
  readonly progressPercentage: number;
  /** Expected completion (if predictable) */
  readonly expectedCompletion?: string | undefined;
}

/**
 * Status of a deployment environment.
 */
export interface EnvironmentStatus {
  /** Environment name */
  readonly environment: DeploymentEnvironment;
  /** Issues deployed to this environment */
  readonly deployedIssues: readonly string[];
  /** Deployment count */
  readonly deploymentCount: number;
  /** Last deployment time */
  readonly lastDeployedAt?: string | undefined;
  /** Last deployment status */
  readonly lastStatus: DeploymentStatus;
  /** Health status */
  readonly health: "healthy" | "degraded" | "down" | "unknown";
}

/**
 * Release status summary.
 */
export interface ReleaseStatus {
  /** Project key */
  readonly projectKey: string;
  /** Version */
  readonly version: string;
  /** Total issues */
  readonly totalIssues: number;
  /** Issues in development */
  readonly inDevelopment: number;
  /** Issues in staging */
  readonly inStaging: number;
  /** Issues in production */
  readonly inProduction: number;
  /** Progress percentage */
  readonly progressPercentage: number;
  /** Environment details */
  readonly environments: readonly EnvironmentStatus[];
  /** Blockers (issues blocking release) */
  readonly blockers: readonly string[];
  /** Recommendations */
  readonly recommendations: readonly string[];
}

/**
 * Options for deployment tracking.
 */
export interface DeploymentTrackingOptions {
  /** Project key */
  readonly projectKey: string;
  /** Version to track */
  readonly version?: string | undefined;
  /** Sprint ID to track */
  readonly sprintId?: number | undefined;
  /** Environments to include */
  readonly environments?: readonly DeploymentEnvironment[] | undefined;
}

/**
 * Deployment link input.
 */
export interface DeploymentLinkInput {
  /** Issue keys to link */
  readonly issueKeys: readonly string[];
  /** Deployment info */
  readonly deployment: DeploymentInfo;
}

/**
 * Deployment link result.
 */
export interface DeploymentLinkResult {
  /** Successfully linked issues */
  readonly linked: readonly string[];
  /** Failed to link */
  readonly failed: readonly string[];
  /** Deployment ID */
  readonly deploymentId: string;
}
