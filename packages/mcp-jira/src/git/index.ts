/**
 * Git Integration Module
 *
 * Provides Git-Jira integration features including:
 * - Repository mapping to Jira projects
 * - Branch name generation from issues
 * - Commit message validation
 * - PR context generation from Jira specifications
 */

// Types
export type {
  BranchType,
  CommitType,
  RepositoryInfo,
  ProjectRepositoryMapping,
  BranchNameInput,
  BranchNameResult,
  CommitValidationInput,
  CommitValidationIssue,
  CommitValidationResult,
  PRContextInput,
  IssueContext,
  PRContextResult,
  RepositoryLinkInput,
  RepositoryLinkResult,
} from "./types.js";

// Repository Store
export {
  linkRepository,
  getProjectRepository,
  getAllRepositoryMappings,
  getRepositoryMappings,
  unlinkRepository,
  hasLinkedRepository,
  getRepositoryCount,
  clearAllMappings,
  getProjectBranchPattern,
  getProjectDefaultBranch,
  validateRepositoryUrl,
} from "./repository-store.js";

// Branch Generator
export {
  generateBranchName,
  inferBranchType,
  validateBranchName,
  parseBranchName,
  getBranchTypes,
  getBranchTypePrefix,
} from "./branch-generator.js";

// Commit Validator
export {
  validateCommitMessage,
  extractIssueKeys,
  suggestCommitMessage,
  inferCommitType,
  getCommitTypes,
  isValidCommitType,
  getCommitTypeDescription,
} from "./commit-validator.js";

// PR Context Builder
export {
  buildPRContext,
  generatePRTitle,
  generatePRBody,
  generateTestingChecklist,
  suggestLabels,
  extractAcceptanceCriteria,
  jiraIssueToContext,
} from "./pr-context-builder.js";
