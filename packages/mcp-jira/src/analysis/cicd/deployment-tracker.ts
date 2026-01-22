/**
 * Deployment Tracker
 *
 * Tracks deployments and release progress.
 * Note: This is a conceptual implementation - actual deployment tracking
 * would require integration with CI/CD systems like GitHub Actions,
 * GitLab CI, or Jenkins via their APIs.
 */

import type {
  DeploymentInfo,
  IssueDeployment,
  ReleaseProgress,
  EnvironmentStatus,
  ReleaseStatus,
  DeploymentEnvironment,
  DeploymentStatus,
} from "./types.js";

/**
 * In-memory storage for deployments (would be replaced with actual storage).
 */
const deploymentStore = new Map<string, IssueDeployment[]>();

/**
 * Environment deployment order (for progress tracking).
 */
const ENVIRONMENT_ORDER: DeploymentEnvironment[] = [
  "development",
  "qa",
  "staging",
  "production",
];

/**
 * Records a deployment for issues.
 */
export function recordDeployment(
  issueKeys: readonly string[],
  deployment: DeploymentInfo
): { linked: string[]; failed: string[] } {
  const linked: string[] = [];
  const failed: string[] = [];

  for (const issueKey of issueKeys) {
    try {
      const existing = deploymentStore.get(issueKey) ?? [];

      // Mark previous deployments as not latest
      const updated = existing.map((d) => ({
        ...d,
        isLatest: d.deployment.environment !== deployment.environment,
      }));

      updated.push({
        issueKey,
        summary: "", // Would be populated from Jira
        deployment,
        firstDeployedAt: updated.length === 0 ? deployment.deployedAt : (updated[0]?.firstDeployedAt ?? deployment.deployedAt),
        isLatest: true,
      });

      deploymentStore.set(issueKey, updated);
      linked.push(issueKey);
    } catch {
      failed.push(issueKey);
    }
  }

  return { linked, failed };
}

/**
 * Gets deployments for an issue.
 */
export function getIssueDeployments(issueKey: string): IssueDeployment[] {
  return deploymentStore.get(issueKey) ?? [];
}

/**
 * Gets the latest deployment for an issue in each environment.
 */
export function getIssueEnvironmentStatus(issueKey: string): Map<DeploymentEnvironment, DeploymentInfo> {
  const deployments = deploymentStore.get(issueKey) ?? [];
  const envStatus = new Map<DeploymentEnvironment, DeploymentInfo>();

  for (const deployment of deployments) {
    const env = deployment.deployment.environment;
    const existing = envStatus.get(env);

    if (!existing || deployment.deployment.deployedAt > existing.deployedAt) {
      envStatus.set(env, deployment.deployment);
    }
  }

  return envStatus;
}

/**
 * Calculates release progress.
 */
export function calculateReleaseProgress(
  issueKeys: readonly string[],
  targetEnvironment: DeploymentEnvironment = "production"
): ReleaseProgress {
  const environments: EnvironmentStatus[] = [];
  const pendingIssues: string[] = [];
  let deployedToTarget = 0;

  // Calculate status for each environment
  for (const env of ENVIRONMENT_ORDER) {
    const deployedIssues: string[] = [];
    let lastDeployedAt: string | undefined;
    let lastStatus: DeploymentStatus = "pending";

    for (const issueKey of issueKeys) {
      const envStatus = getIssueEnvironmentStatus(issueKey);
      const deployment = envStatus.get(env);

      if (deployment) {
        deployedIssues.push(issueKey);

        if (!lastDeployedAt || deployment.deployedAt > lastDeployedAt) {
          lastDeployedAt = deployment.deployedAt;
          lastStatus = deployment.status;
        }
      }
    }

    environments.push({
      environment: env,
      deployedIssues,
      deploymentCount: deployedIssues.length,
      lastDeployedAt,
      lastStatus,
      health: lastStatus === "success" ? "healthy" : lastStatus === "failed" ? "degraded" : "unknown",
    });

    if (env === targetEnvironment) {
      deployedToTarget = deployedIssues.length;
    }
  }

  // Find pending issues
  for (const issueKey of issueKeys) {
    const envStatus = getIssueEnvironmentStatus(issueKey);
    if (envStatus.size === 0) {
      pendingIssues.push(issueKey);
    }
  }

  const progressPercentage = issueKeys.length > 0
    ? Math.round((deployedToTarget / issueKeys.length) * 100)
    : 0;

  return {
    version: "", // Would be populated from caller
    totalIssues: issueKeys.length,
    environments,
    pendingIssues,
    progressPercentage,
  };
}

/**
 * Gets release status summary.
 */
export function getReleaseStatus(
  projectKey: string,
  version: string,
  issueKeys: readonly string[]
): ReleaseStatus {
  const progress = calculateReleaseProgress(issueKeys);

  // Find issues in each environment
  const devEnv = progress.environments.find((e) => e.environment === "development");
  const stagingEnv = progress.environments.find((e) => e.environment === "staging");
  const prodEnv = progress.environments.find((e) => e.environment === "production");

  // Generate recommendations
  const recommendations: string[] = [];

  if (progress.pendingIssues.length > 0) {
    recommendations.push(`${progress.pendingIssues.length} issue(s) not yet deployed - review development status`);
  }

  if (stagingEnv && stagingEnv.deploymentCount > 0 && prodEnv && prodEnv.deploymentCount === 0) {
    recommendations.push("Issues are in staging but not production - consider production deployment");
  }

  const failedEnvs = progress.environments.filter((e) => e.lastStatus === "failed");
  if (failedEnvs.length > 0) {
    recommendations.push(
      `Deployment failures in: ${failedEnvs.map((e) => e.environment).join(", ")} - investigate and retry`
    );
  }

  if (progress.progressPercentage === 100) {
    recommendations.push("All issues deployed to production - release complete");
  }

  return {
    projectKey,
    version,
    totalIssues: progress.totalIssues,
    inDevelopment: devEnv?.deploymentCount ?? 0,
    inStaging: stagingEnv?.deploymentCount ?? 0,
    inProduction: prodEnv?.deploymentCount ?? 0,
    progressPercentage: progress.progressPercentage,
    environments: progress.environments,
    blockers: progress.pendingIssues, // Pending issues block release
    recommendations,
  };
}

/**
 * Generates deployment timeline for an issue.
 */
export function getDeploymentTimeline(issueKey: string): Array<{
  environment: DeploymentEnvironment;
  status: DeploymentStatus;
  deployedAt: string;
  duration?: number;
}> {
  const deployments = getIssueDeployments(issueKey);

  return deployments
    .map((d) => {
      const result: {
        environment: DeploymentEnvironment;
        status: DeploymentStatus;
        deployedAt: string;
        duration?: number;
      } = {
        environment: d.deployment.environment,
        status: d.deployment.status,
        deployedAt: d.deployment.deployedAt,
      };
      if (d.deployment.duration !== undefined) {
        result.duration = d.deployment.duration;
      }
      return result;
    })
    .sort((a, b) => a.deployedAt.localeCompare(b.deployedAt));
}

/**
 * Gets deployment health summary.
 */
export function getDeploymentHealth(): Record<DeploymentEnvironment, {
  status: DeploymentStatus;
  lastDeployment?: string;
  successRate: number;
}> {
  const health: Record<string, {
    status: DeploymentStatus;
    lastDeployment?: string;
    successRate: number;
  }> = {};

  for (const env of ENVIRONMENT_ORDER) {
    let successCount = 0;
    let totalCount = 0;
    let lastDeployment: string | undefined;
    let lastStatus: DeploymentStatus = "pending";

    for (const deployments of deploymentStore.values()) {
      for (const deployment of deployments) {
        if (deployment.deployment.environment === env) {
          totalCount++;
          if (deployment.deployment.status === "success") {
            successCount++;
          }
          if (!lastDeployment || deployment.deployment.deployedAt > lastDeployment) {
            lastDeployment = deployment.deployment.deployedAt;
            lastStatus = deployment.deployment.status;
          }
        }
      }
    }

    const envHealth: {
      status: DeploymentStatus;
      lastDeployment?: string;
      successRate: number;
    } = {
      status: lastStatus,
      successRate: totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 100,
    };
    if (lastDeployment !== undefined) {
      envHealth.lastDeployment = lastDeployment;
    }
    health[env] = envHealth;
  }

  return health as Record<DeploymentEnvironment, {
    status: DeploymentStatus;
    lastDeployment?: string;
    successRate: number;
  }>;
}
