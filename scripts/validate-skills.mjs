#!/usr/bin/env node

/**
 * Skills Validator
 *
 * Validates that all skills comply with the agentskills.io specification
 * and progressive disclosure structure.
 *
 * Usage: node scripts/validate-skills.mjs
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, '..', 'skills');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

const log = {
  success: (msg) => console.log(`   ${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`   ${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`   ${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`   ${colors.dim}${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.cyan}📁 ${msg}${colors.reset}`),
};

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content) {
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const yaml = match[1];
  const result = {};

  // Simple YAML parser for our needs
  let nestedObj = null;

  yaml.split('\n').forEach(line => {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) return;

    const nestedMatch = line.match(/^  (\w+):\s*(.*)$/);
    const keyMatch = line.match(/^(\w[\w-]*):\s*(.*)$/);

    if (nestedMatch && nestedObj) {
      nestedObj[nestedMatch[1]] = nestedMatch[2].replace(/^["']|["']$/g, '');
    } else if (keyMatch) {
      const key = keyMatch[1];
      const value = keyMatch[2].trim();
      if (value) {
        result[key] = value.replace(/^["']|["']$/g, '');
      } else {
        result[key] = {};
        nestedObj = result[key];
      }
    }
  });

  return result;
}

/**
 * Parse MANIFEST.yaml
 */
function parseManifest(content) {
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const result = {
    skill: null,
    version: null,
    progressive_disclosure: {
      metadata: { estimated_tokens: 0 },
      instructions: { estimated_tokens: 0 },
      resources: []
    },
    token_summary: {}
  };

  // Extract skill name
  const skillMatch = normalized.match(/^skill:\s*(.+)$/m);
  if (skillMatch) result.skill = skillMatch[1].trim();

  // Extract version
  const versionMatch = normalized.match(/^version:\s*["']?(.+?)["']?$/m);
  if (versionMatch) result.version = versionMatch[1].trim();

  // Extract metadata tokens
  const metaTokens = normalized.match(/metadata:[\s\S]*?estimated_tokens:\s*(\d+)/);
  if (metaTokens) result.progressive_disclosure.metadata.estimated_tokens = parseInt(metaTokens[1]);

  // Extract instructions tokens
  const instrTokens = normalized.match(/instructions:[\s\S]*?estimated_tokens:\s*(\d+)/);
  if (instrTokens) result.progressive_disclosure.instructions.estimated_tokens = parseInt(instrTokens[1]);

  // Extract resources - improved regex to handle multiline
  const resourcesSection = normalized.match(/resources:\s*\n([\s\S]*?)(?=\nloading_strategy:|$)/);
  if (resourcesSection) {
    const resourceBlocks = resourcesSection[1].split(/\n    - path:/);
    for (let i = 1; i < resourceBlocks.length; i++) {
      const block = '- path:' + resourceBlocks[i];
      const pathMatch = block.match(/path:\s*(.+)/);
      const tokensMatch = block.match(/estimated_tokens:\s*(\d+)/);
      if (pathMatch) {
        result.progressive_disclosure.resources.push({
          path: pathMatch[1].trim(),
          estimated_tokens: tokensMatch ? parseInt(tokensMatch[1]) : 0
        });
      }
    }
  }

  // Extract token summary
  const summaryMatch = normalized.match(/token_summary:[\s\S]*?metadata_only:\s*(\d+)[\s\S]*?with_instructions:\s*(\d+)[\s\S]*?with_all_resources:\s*(\d+)/);
  if (summaryMatch) {
    result.token_summary = {
      metadata_only: parseInt(summaryMatch[1]),
      with_instructions: parseInt(summaryMatch[2]),
      with_all_resources: parseInt(summaryMatch[3])
    };
  }

  return result;
}

/**
 * Validate a single skill
 */
function validateSkill(skillName) {
  const skillDir = join(SKILLS_DIR, skillName);
  const errors = [];
  const warnings = [];
  let tokenSummary = null;

  log.header(skillName);

  // Check SKILL.md exists
  const skillMdPath = join(skillDir, 'SKILL.md');
  if (!existsSync(skillMdPath)) {
    log.error('SKILL.md not found');
    errors.push('Missing SKILL.md');
  } else {
    const content = readFileSync(skillMdPath, 'utf8');
    const frontmatter = parseFrontmatter(content);

    if (!frontmatter) {
      log.error('SKILL.md: Invalid or missing YAML frontmatter');
      errors.push('Invalid frontmatter');
    } else {
      // Validate required fields
      if (!frontmatter.name) {
        log.error('SKILL.md: Missing required field "name"');
        errors.push('Missing name field');
      } else if (frontmatter.name !== skillName) {
        log.error(`SKILL.md: name "${frontmatter.name}" doesn't match directory "${skillName}"`);
        errors.push('Name mismatch');
      } else {
        log.success(`SKILL.md (name: ${frontmatter.name})`);
      }

      if (!frontmatter.description) {
        log.error('SKILL.md: Missing required field "description"');
        errors.push('Missing description field');
      } else {
        const descLen = frontmatter.description.length;
        if (descLen > 1024) {
          log.warn(`Description too long (${descLen}/1024 chars)`);
          warnings.push('Description exceeds 1024 chars');
        }
      }

      // Check optional fields
      if (frontmatter.license) {
        log.info(`License: ${frontmatter.license}`);
      }
    }
  }

  // Check MANIFEST.yaml exists
  const manifestPath = join(skillDir, 'MANIFEST.yaml');
  if (!existsSync(manifestPath)) {
    log.warn('MANIFEST.yaml not found (optional but recommended)');
    warnings.push('Missing MANIFEST.yaml');
  } else {
    const content = readFileSync(manifestPath, 'utf8');
    const manifest = parseManifest(content);

    if (manifest.skill !== skillName) {
      log.error(`MANIFEST.yaml: skill "${manifest.skill}" doesn't match directory`);
      errors.push('Manifest skill mismatch');
    } else {
      log.success(`MANIFEST.yaml (v${manifest.version || '?'})`);
    }

    // Validate resources exist
    const refsDir = join(skillDir, 'references');
    for (const resource of manifest.progressive_disclosure.resources) {
      const resourcePath = join(skillDir, resource.path);
      if (existsSync(resourcePath)) {
        log.success(`${resource.path} (~${resource.estimated_tokens} tokens)`);
      } else {
        log.error(`${resource.path} not found`);
        errors.push(`Missing resource: ${resource.path}`);
      }
    }

    tokenSummary = manifest.token_summary;
  }

  // Show token summary
  if (tokenSummary && tokenSummary.with_all_resources) {
    console.log(`   ${colors.dim}Tokens: ${tokenSummary.metadata_only} → ${tokenSummary.with_instructions} → ${tokenSummary.with_all_resources}${colors.reset}`);
  }

  return { errors, warnings, tokenSummary };
}

/**
 * Main validation
 */
function main() {
  console.log(`${colors.bold}Skills Validator${colors.reset}`);
  console.log(`${colors.dim}Checking agentskills.io compliance...${colors.reset}`);

  // Get all skill directories
  const skills = readdirSync(SKILLS_DIR).filter(f => {
    const fullPath = join(SKILLS_DIR, f);
    return statSync(fullPath).isDirectory();
  });

  if (skills.length === 0) {
    console.log(`\n${colors.red}No skills found in ${SKILLS_DIR}${colors.reset}`);
    process.exit(1);
  }

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalTokens = 0;
  const results = [];

  for (const skill of skills) {
    const result = validateSkill(skill);
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
    if (result.tokenSummary?.with_all_resources) {
      totalTokens += result.tokenSummary.with_all_resources;
    }
    results.push({ skill, ...result });
  }

  // Summary
  console.log(`\n${colors.bold}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}Summary${colors.reset}`);
  console.log(`${colors.bold}═══════════════════════════════════════════${colors.reset}`);

  const validCount = results.filter(r => r.errors.length === 0).length;
  const statusColor = totalErrors === 0 ? colors.green : colors.red;

  console.log(`\n  Skills: ${statusColor}${validCount}/${skills.length} valid${colors.reset}`);

  if (totalWarnings > 0) {
    console.log(`  Warnings: ${colors.yellow}${totalWarnings}${colors.reset}`);
  }

  if (totalErrors > 0) {
    console.log(`  Errors: ${colors.red}${totalErrors}${colors.reset}`);
  }

  console.log(`\n  ${colors.cyan}Token Budget (all resources loaded):${colors.reset}`);
  console.log(`  ${totalTokens.toLocaleString()} tokens total`);

  // Show per-skill breakdown
  console.log(`\n  ${colors.dim}Per-skill breakdown:${colors.reset}`);
  for (const result of results) {
    if (result.tokenSummary?.with_all_resources) {
      const pct = ((result.tokenSummary.with_all_resources / totalTokens) * 100).toFixed(1);
      console.log(`  ${colors.dim}  ${result.skill}: ${result.tokenSummary.with_all_resources.toLocaleString()} (${pct}%)${colors.reset}`);
    }
  }

  console.log('');

  // Exit with error code if validation failed
  process.exit(totalErrors > 0 ? 1 : 0);
}

main();
