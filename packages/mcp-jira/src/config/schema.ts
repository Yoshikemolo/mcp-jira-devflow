/**
 * Configuration Schema
 *
 * Zod schemas for validating Jira configuration.
 * All credentials must come from environment variables.
 */

import { z } from "zod";

/**
 * Authentication configuration schema.
 * Supports Basic Auth (email + API token) which is the standard for Jira Cloud.
 */
export const AuthConfigSchema = z.object({
  type: z.literal("basic"),
  email: z
    .string()
    .email("JIRA_USER_EMAIL must be a valid email address")
    .describe("Jira user email from JIRA_USER_EMAIL env var"),
  apiToken: z
    .string()
    .min(1, "JIRA_API_TOKEN is required")
    .describe("Jira API token from JIRA_API_TOKEN env var"),
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>;

/**
 * Main Jira configuration schema.
 */
export const JiraConfigSchema = z.object({
  baseUrl: z
    .string()
    .url("JIRA_BASE_URL must be a valid URL")
    .refine(
      (url) => url.startsWith("https://"),
      "JIRA_BASE_URL must use HTTPS"
    )
    .transform((url) => url.replace(/\/$/, "")) // Remove trailing slash
    .describe("Jira instance base URL from JIRA_BASE_URL env var"),
  auth: AuthConfigSchema,
  timeout: z
    .number()
    .int()
    .positive()
    .default(30000)
    .describe("Request timeout in milliseconds"),
  maxRetries: z
    .number()
    .int()
    .min(0)
    .max(5)
    .default(3)
    .describe("Maximum retry attempts for failed requests"),
});

export type JiraConfig = z.infer<typeof JiraConfigSchema>;

/**
 * Loads configuration from environment variables.
 * Throws if required variables are missing or invalid.
 */
export function loadConfigFromEnv(): JiraConfig {
  const rawConfig = {
    baseUrl: process.env["JIRA_BASE_URL"],
    auth: {
      type: "basic" as const,
      email: process.env["JIRA_USER_EMAIL"],
      apiToken: process.env["JIRA_API_TOKEN"],
    },
    timeout: process.env["JIRA_TIMEOUT"]
      ? parseInt(process.env["JIRA_TIMEOUT"], 10)
      : undefined,
    maxRetries: process.env["JIRA_MAX_RETRIES"]
      ? parseInt(process.env["JIRA_MAX_RETRIES"], 10)
      : undefined,
  };

  const result = JiraConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(`Invalid Jira configuration:\n${errors}`);
  }

  return result.data;
}

/**
 * Validates a configuration object.
 * Returns the validated config or throws on error.
 */
export function validateConfig(config: unknown): JiraConfig {
  return JiraConfigSchema.parse(config);
}
