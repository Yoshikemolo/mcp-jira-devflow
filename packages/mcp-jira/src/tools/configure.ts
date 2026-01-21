/**
 * Configure Tool
 *
 * MCP tool for runtime configuration of Jira credentials.
 * Includes security warnings and connection verification.
 */

import { z } from "zod";
import { createConfig } from "../config/index.js";
import { JiraClient } from "../domain/jira-client.js";
import { setConfigured } from "../server-state.js";

/**
 * Input schema for jira_configure tool.
 */
export const ConfigureInputSchema = z.object({
  baseUrl: z
    .string()
    .url("baseUrl must be a valid URL")
    .refine(
      (url) => url.startsWith("https://"),
      "baseUrl must use HTTPS for security"
    )
    .describe("Jira instance URL (e.g., https://company.atlassian.net)"),
  email: z
    .string()
    .email("email must be a valid email address")
    .describe("Your Jira account email"),
  apiToken: z
    .string()
    .min(1, "apiToken is required")
    .describe("Your Jira API token"),
  confirmSecurityWarning: z
    .boolean()
    .optional()
    .describe("Set to true to acknowledge security warning"),
});

export type ConfigureInput = z.infer<typeof ConfigureInputSchema>;

/**
 * Tool definition for MCP registration.
 */
export const configureTool = {
  name: "jira_configure",
  description:
    "Configure Jira credentials for this session. " +
    "WARNING: Credentials will be visible in chat history. " +
    "For better security, use environment variables instead. " +
    "Set confirmSecurityWarning to true to proceed.",
  inputSchema: {
    type: "object" as const,
    properties: {
      baseUrl: {
        type: "string",
        description:
          "Jira instance URL (e.g., https://company.atlassian.net)",
      },
      email: {
        type: "string",
        description: "Your Jira account email",
      },
      apiToken: {
        type: "string",
        description: "Your Jira API token",
      },
      confirmSecurityWarning: {
        type: "boolean",
        description:
          "Set to true to acknowledge that credentials will be visible in chat history",
      },
    },
    required: ["baseUrl", "email", "apiToken"],
  },
};

/**
 * Executes the configure tool.
 */
export async function executeConfigure(input: unknown): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  // Validate input
  const parseResult = ConfigureInputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      content: [{ type: "text", text: `Validation error: ${errors}` }],
      isError: true,
    };
  }

  const { baseUrl, email, apiToken, confirmSecurityWarning } = parseResult.data;

  // Security warning check
  if (!confirmSecurityWarning) {
    return {
      content: [
        {
          type: "text",
          text: `## Security Warning

The credentials you provide will be visible in the chat history of this conversation.

**For better security, consider using environment variables instead:**

\`\`\`bash
export JIRA_BASE_URL="${baseUrl}"
export JIRA_USER_EMAIL="${email}"
export JIRA_API_TOKEN="your-api-token"
\`\`\`

Then restart the MCP server.

**To proceed with runtime configuration anyway**, call this tool again with \`confirmSecurityWarning: true\`:

\`\`\`
jira_configure(
  baseUrl: "${baseUrl}",
  email: "${email}",
  apiToken: "your-api-token",
  confirmSecurityWarning: true
)
\`\`\`

Your credentials will be stored in memory only (not persisted to disk) and will be lost when the server restarts.`,
        },
      ],
      isError: true,
    };
  }

  // Create config (validates format)
  let config;
  try {
    config = createConfig({ baseUrl, email, apiToken });
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Configuration error: ${error instanceof Error ? error.message : "Invalid configuration"}`,
        },
      ],
      isError: true,
    };
  }

  // Create client and verify connection
  const client = new JiraClient(config);

  try {
    const connectionInfo = await client.verifyConnection();

    // Update server state
    setConfigured(config, client);

    const userName = connectionInfo.user?.displayName ?? "Unknown";
    const userEmail = connectionInfo.user?.emailAddress;
    const deployment = connectionInfo.serverInfo?.deploymentType ?? "Unknown";

    return {
      content: [
        {
          type: "text",
          text: `## Jira Configured Successfully

**Instance**: ${baseUrl}
**Connected as**: ${userName}${userEmail ? ` (${userEmail})` : ""}
**Deployment**: ${deployment}

All Jira tools are now available:
- \`get_issue\` - Retrieve a Jira issue by key
- \`search_jql\` - Search issues with JQL
- \`get_issue_comments\` - Get comments from an issue

**Note**: This configuration is stored in memory only and will be lost when the server restarts. For persistent configuration, use environment variables.`,
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Provide helpful error messages
    let helpText = "";
    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
      helpText =
        "\n\n**Tip**: Check that your email and API token are correct. " +
        "API tokens can be generated at: https://id.atlassian.com/manage-profile/security/api-tokens";
    } else if (
      errorMessage.includes("403") ||
      errorMessage.includes("Forbidden")
    ) {
      helpText =
        "\n\n**Tip**: Your account may not have permission to access this Jira instance.";
    } else if (
      errorMessage.includes("ENOTFOUND") ||
      errorMessage.includes("getaddrinfo")
    ) {
      helpText =
        "\n\n**Tip**: Could not resolve the hostname. Check that your baseUrl is correct.";
    }

    return {
      content: [
        {
          type: "text",
          text: `## Connection Failed

Could not connect to Jira: ${errorMessage}${helpText}

Please verify your credentials and try again.`,
        },
      ],
      isError: true,
    };
  }
}
