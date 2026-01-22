/**
 * Repository Store
 *
 * In-memory storage for project-to-repository mappings.
 * Stores links between Jira projects and Git repositories.
 */

import type {
  RepositoryInfo,
  ProjectRepositoryMapping,
  RepositoryLinkResult,
} from "./types.js";

/**
 * In-memory storage for project-repository mappings.
 */
const repositoryStore = new Map<string, ProjectRepositoryMapping>();

/**
 * Extracts repository name from URL.
 */
function extractRepoName(url: string): string {
  // Handle various URL formats
  // https://github.com/owner/repo.git
  // git@github.com:owner/repo.git
  // https://github.com/owner/repo
  const cleaned = url.replace(/\.git$/, "");
  const parts = cleaned.split(/[/:]/);
  return parts[parts.length - 1] || "unknown";
}

/**
 * Detects repository provider from URL.
 */
function detectProvider(url: string): string | undefined {
  if (url.includes("github.com")) return "github";
  if (url.includes("gitlab.com") || url.includes("gitlab")) return "gitlab";
  if (url.includes("bitbucket.org") || url.includes("bitbucket")) return "bitbucket";
  if (url.includes("azure.com") || url.includes("visualstudio.com")) return "azure";
  if (url.includes("codecommit")) return "codecommit";
  return undefined;
}

/**
 * Validates repository URL format.
 */
export function validateRepositoryUrl(url: string): { valid: boolean; error?: string } {
  // Check for common Git URL patterns
  const httpsPattern = /^https?:\/\/.+\/.+\/.+$/;
  const sshPattern = /^git@.+:.+\/.+$/;

  if (httpsPattern.test(url) || sshPattern.test(url)) {
    return { valid: true };
  }

  return {
    valid: false,
    error: "Invalid repository URL format. Expected HTTPS (https://...) or SSH (git@...) format.",
  };
}

/**
 * Links a repository to a Jira project.
 */
export function linkRepository(
  projectKey: string,
  repositoryUrl: string,
  options: {
    defaultBranch?: string | undefined;
    branchPattern?: string | undefined;
    linkedBy?: string | undefined;
  } = {}
): RepositoryLinkResult {
  const normalizedKey = projectKey.toUpperCase();

  // Validate URL
  const urlValidation = validateRepositoryUrl(repositoryUrl);
  if (!urlValidation.valid) {
    return {
      success: false,
      projectKey: normalizedKey,
      repository: {
        url: repositoryUrl,
        name: "",
        defaultBranch: options.defaultBranch ?? "main",
      },
      message: urlValidation.error ?? "Invalid repository URL",
      isUpdate: false,
    };
  }

  // Check if mapping already exists
  const existing = repositoryStore.get(normalizedKey);
  const isUpdate = existing !== undefined;

  // Create repository info
  const repository: RepositoryInfo = {
    url: repositoryUrl,
    name: extractRepoName(repositoryUrl),
    defaultBranch: options.defaultBranch ?? "main",
    branchPattern: options.branchPattern,
    provider: detectProvider(repositoryUrl),
  };

  // Create mapping
  const mapping: ProjectRepositoryMapping = {
    projectKey: normalizedKey,
    repository,
    linkedAt: new Date().toISOString(),
    linkedBy: options.linkedBy,
  };

  repositoryStore.set(normalizedKey, mapping);

  return {
    success: true,
    projectKey: normalizedKey,
    repository,
    message: isUpdate
      ? `Updated repository mapping for project ${normalizedKey}`
      : `Linked repository to project ${normalizedKey}`,
    isUpdate,
  };
}

/**
 * Gets repository mapping for a project.
 */
export function getProjectRepository(projectKey: string): ProjectRepositoryMapping | undefined {
  return repositoryStore.get(projectKey.toUpperCase());
}

/**
 * Gets all repository mappings.
 */
export function getAllRepositoryMappings(): ProjectRepositoryMapping[] {
  return Array.from(repositoryStore.values());
}

/**
 * Gets repository mappings filtered by project key pattern.
 */
export function getRepositoryMappings(projectKey?: string): ProjectRepositoryMapping[] {
  if (!projectKey) {
    return getAllRepositoryMappings();
  }

  const normalizedKey = projectKey.toUpperCase();
  const mapping = repositoryStore.get(normalizedKey);
  return mapping ? [mapping] : [];
}

/**
 * Removes repository mapping for a project.
 */
export function unlinkRepository(projectKey: string): boolean {
  return repositoryStore.delete(projectKey.toUpperCase());
}

/**
 * Checks if a project has a linked repository.
 */
export function hasLinkedRepository(projectKey: string): boolean {
  return repositoryStore.has(projectKey.toUpperCase());
}

/**
 * Gets repository count.
 */
export function getRepositoryCount(): number {
  return repositoryStore.size;
}

/**
 * Clears all repository mappings (for testing).
 */
export function clearAllMappings(): void {
  repositoryStore.clear();
}

/**
 * Gets the default branch pattern for a project.
 */
export function getProjectBranchPattern(projectKey: string): string | undefined {
  const mapping = repositoryStore.get(projectKey.toUpperCase());
  return mapping?.repository.branchPattern;
}

/**
 * Gets the default branch for a project.
 */
export function getProjectDefaultBranch(projectKey: string): string {
  const mapping = repositoryStore.get(projectKey.toUpperCase());
  return mapping?.repository.defaultBranch ?? "main";
}
