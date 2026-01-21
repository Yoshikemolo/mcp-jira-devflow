import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JiraClient } from './dist/domain/jira-client.js';
import { analyzeIssue } from './dist/guidance/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.join(__dirname, '.jira-test-config.json');

// ANSI color codes
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
};

function printHeader() {
  const B = `${c.cyan}${c.bright}`;
  const R = c.reset;
  const W = '═══════════════════════════════════════════════';

  console.log('');
  console.log(`${B}╔${W}╗${R}`);
  console.log(`${B}║${R}  ${c.blue}${c.bright}░██████╗░█████╗░██████╗░██╗░░░██╗███╗░░░███╗${R} ${B}║${R}`);
  console.log(`${B}║${R}  ${c.blue}${c.bright}██╔════╝██╔══██╗██╔══██╗██║░░░██║████╗░████║${R} ${B}║${R}`);
  console.log(`${B}║${R}  ${c.blue}${c.bright}╚█████╗░██║░░╚═╝██████╔╝██║░░░██║██╔████╔██║${R} ${B}║${R}`);
  console.log(`${B}║${R}  ${c.blue}${c.bright}░╚═══██╗██║░░██╗██╔══██╗██║░░░██║██║╚██╔╝██║${R} ${B}║${R}`);
  console.log(`${B}║${R}  ${c.blue}${c.bright}██████╔╝╚█████╔╝██║░░██║╚██████╔╝██║░╚═╝░██║${R} ${B}║${R}`);
  console.log(`${B}║${R}  ${c.blue}${c.bright}╚═════╝░░╚════╝░╚═╝░░╚═╝░╚═════╝░╚═╝░░░░░╚═╝${R} ${B}║${R}`);
  console.log(`${B}║${R}     ${c.magenta}${c.bright}G U I D A N C E   T E S T   T O O L${R}       ${B}║${R}`);
  console.log(`${B}║${R}  ${c.dim}Analyze Jira issues for SCRUM best practices${R} ${B}║${R}`);
  console.log(`${B}╠${W}╣${R}`);
  console.log(`${B}║${R}     ${c.yellow}mcp-jira-devflow${R} ${c.dim}By${R} ${c.white}Ximplicity${R} ${c.dim}• 2026${R}     ${B}║${R}`);
  console.log(`${B}║${R}    ${c.dim}github.com/Yoshikemolo/mcp-jira-devflow${R}    ${B}║${R}`);
  console.log(`${B}╚${W}╝${R}`);
  console.log('');
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function loadSavedConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    // Ignore errors, will prompt for config
  }
  return null;
}

function obfuscateEmail(email) {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visibleChars = Math.min(3, Math.floor(local.length / 2));
  const obfuscated = local.substring(0, visibleChars) + '***' + local.substring(local.length - visibleChars);
  return `${obfuscated}@${domain}`;
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(`\n${c.green}${c.bright}✓${c.reset} Credentials saved to ${c.dim}${CONFIG_FILE}${c.reset}`);
    console.log(`  ${c.yellow}Note:${c.reset} ${c.dim}This file contains sensitive data. Do not commit it to version control.${c.reset}`);
  } catch (error) {
    console.error(`\n${c.red}Failed to save config:${c.reset}`, error.message);
  }
}

async function askToSaveConfig(config) {
  console.log(`\n${c.yellow}${c.bright}⚠️  SECURITY WARNING${c.reset}`);
  console.log(`${c.dim}   Saving credentials stores your API token in plain text.${c.reset}`);
  console.log(`${c.dim}   Do not commit this file to version control.${c.reset}`);
  const answer = await question(`\n${c.cyan}Save credentials locally for future use?${c.reset} (y/n): `);
  if (answer.toLowerCase() === 'y') {
    saveConfig(config);
  }
}

async function getConfig() {
  // First check environment variables
  let baseUrl = process.env.JIRA_BASE_URL;
  let email = process.env.JIRA_USER_EMAIL;
  let apiToken = process.env.JIRA_API_TOKEN;

  // If all env vars are set, use them
  if (baseUrl && email && apiToken) {
    console.log(`\n${c.green}${c.bright}✓${c.reset} Using credentials from environment variables:`);
    console.log(`  ${c.dim}Jira URL:${c.reset}  ${baseUrl}`);
    console.log(`  ${c.dim}Email:${c.reset}     ${obfuscateEmail(email)}`);
    console.log(`  ${c.dim}API Token:${c.reset} ****`);
    return { baseUrl, email, apiToken, fromEnv: true };
  }

  // Check for saved config
  const savedConfig = loadSavedConfig();

  if (savedConfig) {
    console.log(`\n${c.blue}${c.bright}📁 Found saved credentials:${c.reset}`);
    console.log(`  ${c.dim}Jira URL:${c.reset}  ${savedConfig.baseUrl}`);
    console.log(`  ${c.dim}Email:${c.reset}     ${obfuscateEmail(savedConfig.email)}`);
    console.log(`  ${c.dim}API Token:${c.reset} ****`);

    const useSaved = await question(`\n${c.cyan}Use these saved credentials?${c.reset} (y/n): `);

    if (useSaved.toLowerCase() === 'y') {
      return { ...savedConfig, fromSaved: true };
    }
  }

  // Prompt for new credentials
  console.log(`\n${c.bright}Enter Jira credentials:${c.reset}\n`);

  baseUrl = await question(`${c.cyan}Jira URL${c.reset} (e.g., https://your-company.atlassian.net): `);
  email = await question(`${c.cyan}Email${c.reset}: `);
  apiToken = await question(`${c.cyan}API Token${c.reset}: `);

  const config = { baseUrl, email, apiToken };

  // Ask to save
  await askToSaveConfig(config);

  return config;
}

async function listMyIssues(client) {
  console.log(`\n${c.dim}Fetching your assigned issues...${c.reset}`);

  const result = await client.searchJql('assignee = currentUser() AND statusCategory = "To Do" ORDER BY updated DESC', {
    maxResults: 20
  });

  if (result.issues.length === 0) {
    console.log(`\n${c.yellow}No unresolved issues assigned to you.${c.reset}\n`);
    return;
  }

  console.log(`\n${c.green}${c.bright}Found ${result.issues.length} issue(s) assigned to you:${c.reset}\n`);

  for (const issue of result.issues) {
    const statusColor = issue.status.categoryKey === 'done' ? c.green :
                        issue.status.categoryKey === 'indeterminate' ? c.yellow : c.blue;
    const typeName = issue.issueType.name.toLowerCase();
    const typeIcon = typeName === 'bug' ? `${c.red}[BUG]${c.reset}` :
                     typeName === 'story' ? `${c.green}[STORY]${c.reset}` :
                     typeName === 'epic' ? `${c.magenta}[EPIC]${c.reset}` :
                     typeName === 'task' ? `${c.blue}[TASK]${c.reset}` :
                     typeName === 'sub-task' || typeName === 'subtask' ? `${c.cyan}[SUB]${c.reset}` :
                     `${c.dim}[${issue.issueType.name.toUpperCase()}]${c.reset}`;

    console.log(`  ${c.yellow}${issue.key}${c.reset} ${typeIcon} ${issue.summary.substring(0, 50)}${issue.summary.length > 50 ? '...' : ''}`);
    console.log(`    ${c.dim}Status:${c.reset} ${statusColor}${issue.status.name}${c.reset}  ${c.dim}Type:${c.reset} ${issue.issueType.name}\n`);
  }
}

async function main() {
  printHeader();

  try {
    const config = await getConfig();

    console.log(`\n${c.dim}Connecting to Jira...${c.reset}`);

    const client = new JiraClient({
      baseUrl: config.baseUrl,
      auth: {
        email: config.email,
        apiToken: config.apiToken
      },
      timeout: 30000,
      maxRetries: 3
    });

    // Ask if user wants to see their assigned issues
    const showIssues = await question(`\n${c.cyan}Show your assigned issues?${c.reset} (y/n): `);

    if (showIssues.toLowerCase() === 'y') {
      await listMyIssues(client);
    }

    const issueKey = await question(`${c.cyan}Issue key to analyze${c.reset} (e.g., PROJ-123): `);

    console.log(`\n${c.dim}Fetching issue ${issueKey}...${c.reset}`);
    const issue = await client.getIssue(issueKey);

    console.log(`${c.dim}Analyzing ${issue.issueType.name}: "${issue.summary}"...${c.reset}\n`);

    const result = analyzeIssue(issue, { level: 'standard' });

    // Display formatted results
    console.log(`${c.cyan}${c.bright}╔══════════════════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.cyan}${c.bright}║${c.reset}  ${c.bright}RESULTS${c.reset}                                                     ${c.cyan}${c.bright}║${c.reset}`);
    console.log(`${c.cyan}${c.bright}╚══════════════════════════════════════════════════════════════╝${c.reset}\n`);

    console.log(`  ${c.bright}Issue:${c.reset}        ${c.yellow}${result.summary.issueKey}${c.reset} (${result.summary.issueType})`);
    console.log(`  ${c.bright}Status:${c.reset}       ${result.summary.statusCategory}`);

    const healthColor = result.summary.healthScore >= 80 ? c.green : result.summary.healthScore >= 50 ? c.yellow : c.red;
    const completenessColor = result.summary.completenessScore >= 80 ? c.green : result.summary.completenessScore >= 50 ? c.yellow : c.red;

    console.log(`  ${c.bright}Health:${c.reset}       ${healthColor}${result.summary.healthScore}/100${c.reset}`);
    console.log(`  ${c.bright}Completeness:${c.reset} ${completenessColor}${result.summary.completenessScore}/100${c.reset}`);

    if (result.recommendations.length > 0) {
      console.log(`\n${c.magenta}${c.bright}── Recommendations ─────────────────────────────────────────────${c.reset}\n`);
      for (const rec of result.recommendations) {
        const sevColor = rec.severity === 'critical' ? c.red : rec.severity === 'high' ? c.yellow : rec.severity === 'medium' ? c.blue : c.dim;
        console.log(`  ${sevColor}${c.bright}[${rec.severity.toUpperCase()}]${c.reset} ${c.bright}${rec.title}${c.reset}`);
        console.log(`  ${c.dim}${rec.description}${c.reset}`);
        console.log(`  ${c.green}→ ${rec.suggestedAction}${c.reset}\n`);
      }
    } else {
      console.log(`\n  ${c.green}${c.bright}✓ No recommendations - issue follows SCRUM best practices${c.reset}\n`);
    }

    if (result.workflowActions.length > 0) {
      console.log(`${c.blue}${c.bright}── Suggested Actions ───────────────────────────────────────────${c.reset}\n`);
      for (const action of result.workflowActions) {
        const prioColor = action.priority === 'high' ? c.red : action.priority === 'medium' ? c.yellow : c.dim;
        console.log(`  ${prioColor}[${action.priority}]${c.reset} ${c.bright}${action.action}${c.reset}`);
        console.log(`  ${c.dim}${action.reason}${c.reset}\n`);
      }
    }

    if (result.followUpPrompts.length > 0) {
      console.log(`${c.yellow}${c.bright}── Follow-up Prompts ───────────────────────────────────────────${c.reset}\n`);
      for (const prompt of result.followUpPrompts) {
        console.log(`  ${c.cyan}▸${c.reset} "${c.bright}${prompt.prompt}${c.reset}"`);
        console.log(`    ${c.dim}${prompt.description}${c.reset}\n`);
      }
    }

    console.log(`${c.dim}────────────────────────────────────────────────────────────────${c.reset}\n`);

  } catch (error) {
    console.error(`\n${c.red}${c.bright}Error:${c.reset} ${error.message}`);
    if (error.message.includes('401') || error.message.includes('Authentication')) {
      console.log(`\n${c.yellow}Please verify your email and API token are correct.${c.reset}`);
      console.log(`${c.dim}You can create a token at: https://id.atlassian.com/manage-profile/security/api-tokens${c.reset}`);
    }
  } finally {
    rl.close();
  }
}

main();
