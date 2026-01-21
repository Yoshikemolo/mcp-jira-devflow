/**
 * Setup Guide Tool
 *
 * MCP tool that provides setup instructions and current configuration status.
 * Always available regardless of configuration state.
 */

import { getMissingConfigFields } from "../config/index.js";
import { getServerState, getConfig } from "../server-state.js";

/**
 * Tool definition for MCP registration.
 */
export const setupGuideTool = {
  name: "jira_setup_guide",
  description:
    "Shows Jira configuration status and provides setup instructions. " +
    "Use this tool to check if Jira is configured and get help with setup.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
};

/**
 * Generates the setup guide content.
 */
function generateSetupGuide(): string {
  const state = getServerState();
  const missing = getMissingConfigFields();

  const sections: string[] = [];

  // Status section
  if (state.status === "configured") {
    const config = getConfig();
    sections.push(`## Configuration Status: CONFIGURED

Jira is configured and ready to use.

- **Instance**: ${config?.baseUrl ?? "unknown"}
- **User**: ${config?.auth.email ?? "unknown"}

All Jira tools are available. You can use:
- \`get_issue\` - Retrieve a Jira issue by key
- \`search_jql\` - Search issues with JQL
- \`get_issue_comments\` - Get comments from an issue`);
  } else {
    sections.push(`## Configuration Status: NOT CONFIGURED

Jira is not configured. Missing credentials:
${missing.map((f) => `- **${f.envVar}**: ${f.description}`).join("\n")}

Use \`jira_configure\` to set up credentials now, or configure environment variables and restart.`);
  }

  // Setup instructions section
  sections.push(`## How to Get Jira API Token

1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a label (e.g., "MCP Jira")
4. Copy the generated token (you won't see it again!)

## Configuration Options

### Option 1: Environment Variables (Recommended)

Set these environment variables before starting the MCP server:

\`\`\`bash
export JIRA_BASE_URL="https://your-company.atlassian.net"
export JIRA_USER_EMAIL="your-email@company.com"
export JIRA_API_TOKEN="your-api-token"
\`\`\`

For Claude Code, add to your MCP config (~/.claude/claude_desktop_config.json):

\`\`\`json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-jira"],
      "env": {
        "JIRA_BASE_URL": "https://your-company.atlassian.net",
        "JIRA_USER_EMAIL": "your-email@company.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
\`\`\`

### Option 2: Runtime Configuration

Use the \`jira_configure\` tool to set credentials during this session:

\`\`\`
jira_configure(
  baseUrl: "https://your-company.atlassian.net",
  email: "your-email@company.com",
  apiToken: "your-api-token"
)
\`\`\`

**Note**: Runtime configuration is stored in memory only and will be lost when the server restarts.

### Option 3: Docker

\`\`\`bash
docker run -e JIRA_BASE_URL="https://..." -e JIRA_USER_EMAIL="..." -e JIRA_API_TOKEN="..." mcp-jira
\`\`\`

Or with docker-compose:

\`\`\`yaml
services:
  mcp-jira:
    image: mcp-jira
    env_file: .env
\`\`\`

## Security Best Practices

1. **Never commit credentials** - Use environment variables or secrets management
2. **Use API tokens, not passwords** - API tokens can be revoked independently
3. **Limit token scope** - Create tokens specifically for this integration
4. **Rotate tokens periodically** - Revoke and regenerate tokens regularly
5. **Prefer environment variables** - More secure than runtime configuration

## Troubleshooting

- **401 Unauthorized**: Check your email and API token are correct
- **403 Forbidden**: Your account may not have permission for the requested resource
- **404 Not Found**: Verify your base URL is correct (include https://)
- **Connection refused**: Check your network and firewall settings`);

  return sections.join("\n\n");
}

/**
 * Executes the setup guide tool.
 */
export async function executeSetupGuide(): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  const guide = generateSetupGuide();

  return {
    content: [{ type: "text", text: guide }],
  };
}
