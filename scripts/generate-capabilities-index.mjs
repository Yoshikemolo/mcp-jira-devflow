#!/usr/bin/env node
/**
 * Generate capabilities index from features directory
 *
 * This script scans the features/ directory and generates:
 * - CAPABILITIES.md - Human-readable capabilities overview
 * - FEATURES_INDEX.md - Structured feature index for agents
 *
 * Usage: node scripts/generate-capabilities-index.mjs
 */

import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const FEATURES_DIR = join(ROOT_DIR, 'features');

/**
 * Parse README.md to extract feature metadata
 */
async function parseFeatureReadme(featurePath) {
  const readmePath = join(featurePath, 'README.md');

  try {
    const content = await readFile(readmePath, 'utf-8');

    // Extract metadata from the table
    const metadata = {};
    const tableMatch = content.match(/\| Property \| Value \|[\s\S]*?\n\n/);
    if (tableMatch) {
      const rows = tableMatch[0].split('\n').slice(2); // Skip header rows
      for (const row of rows) {
        const match = row.match(/\| \*\*(.+?)\*\* \| (.+?) \|/);
        if (match) {
          const key = match[1].toLowerCase().replace(/ /g, '_');
          metadata[key] = match[2].replace(/`/g, '');
        }
      }
    }

    // Extract summary
    const summaryMatch = content.match(/## Summary\n\n(.+?)(\n\n|$)/s);
    metadata.summary = summaryMatch ? summaryMatch[1].trim() : '';

    // Extract tools from Quick Reference
    const toolsMatch = content.match(/## Quick Reference[\s\S]*?\| Tool \| Purpose \|[\s\S]*?\n\n/);
    if (toolsMatch) {
      const toolRows = toolsMatch[0].split('\n').filter(r => r.startsWith('| `'));
      metadata.tools = toolRows.map(row => {
        const match = row.match(/\| `(.+?)` \| (.+?) \|/);
        return match ? { name: match[1], purpose: match[2] } : null;
      }).filter(Boolean);
    }

    return metadata;
  } catch (error) {
    console.warn(`  Warning: Could not parse ${readmePath}`);
    return null;
  }
}

/**
 * Parse scope.md to extract additional details
 */
async function parseFeatureScope(featurePath) {
  const scopePath = join(featurePath, 'scope.md');

  try {
    const content = await readFile(scopePath, 'utf-8');

    // Extract status
    const statusMatch = content.match(/## Status\n\n\*\*(.+?)\*\*/);
    const status = statusMatch ? statusMatch[1] : 'Unknown';

    // Extract In Scope items
    const inScopeMatch = content.match(/## In Scope\n\n([\s\S]*?)(\n## |$)/);
    const inScope = inScopeMatch
      ? inScopeMatch[1].split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2))
      : [];

    return { status, inScope };
  } catch (error) {
    return { status: 'Unknown', inScope: [] };
  }
}

/**
 * Get all documents in a feature folder
 */
async function getFeatureDocuments(featurePath, featureId) {
  const docs = [];
  const expectedDocs = ['README.md', 'scope.md', 'acceptance-criteria.md', 'agent-instructions.md', 'tool-contracts.md'];

  for (const doc of expectedDocs) {
    const docPath = join(featurePath, doc);
    try {
      await stat(docPath);
      docs.push({
        name: doc,
        path: `features/${featureId}/${doc}`
      });
    } catch {
      // Document doesn't exist
    }
  }

  return docs;
}

/**
 * Scan features directory
 */
async function scanFeatures() {
  const features = [];

  const entries = await readdir(FEATURES_DIR);
  const featureDirs = entries.filter(e => e.match(/^F\d{3}-/)).sort();

  for (const dir of featureDirs) {
    const featurePath = join(FEATURES_DIR, dir);
    const stats = await stat(featurePath);

    if (!stats.isDirectory()) continue;

    console.log(`  Scanning ${dir}...`);

    const readme = await parseFeatureReadme(featurePath);
    const scope = await parseFeatureScope(featurePath);
    const documents = await getFeatureDocuments(featurePath, dir);

    if (readme) {
      features.push({
        id: dir.split('-')[0],
        name: dir,
        ...readme,
        ...scope,
        documents
      });
    }
  }

  return features;
}

/**
 * Generate CAPABILITIES.md
 */
function generateCapabilities(features) {
  const lines = [
    '# MCP Jira DevFlow Capabilities',
    '',
    '> Auto-generated from features directory. Do not edit manually.',
    '',
    '## Overview',
    '',
    `This document provides an overview of all ${features.length} capabilities available in MCP Jira DevFlow.`,
    '',
    '## Capabilities Summary',
    '',
    '| ID | Name | Status | Tools |',
    '|----|------|--------|-------|',
  ];

  for (const f of features) {
    const toolCount = f.tools?.length || 0;
    lines.push(`| ${f.id} | ${f.summary?.slice(0, 50) || f.name}... | ${f.status} | ${toolCount} |`);
  }

  lines.push('', '## Detailed Capabilities', '');

  for (const f of features) {
    lines.push(`### ${f.id}: ${f.name.replace(/^F\d{3}-/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`);
    lines.push('');
    lines.push(`**Status:** ${f.status}`);
    if (f.package) lines.push(`**Package:** \`${f.package}\``);
    if (f.skills) lines.push(`**Skills:** \`${f.skills}\``);
    lines.push('');
    if (f.summary) {
      lines.push(f.summary);
      lines.push('');
    }

    if (f.tools?.length) {
      lines.push('**Tools:**');
      for (const tool of f.tools) {
        lines.push(`- \`${tool.name}\` - ${tool.purpose}`);
      }
      lines.push('');
    }

    if (f.inScope?.length) {
      lines.push('**Capabilities:**');
      for (const item of f.inScope.slice(0, 5)) {
        lines.push(`- ${item}`);
      }
      if (f.inScope.length > 5) {
        lines.push(`- ... and ${f.inScope.length - 5} more`);
      }
      lines.push('');
    }

    lines.push(`[Full Documentation](./features/${f.name}/)`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  lines.push('');
  lines.push(`*Generated: ${new Date().toISOString().split('T')[0]}*`);

  return lines.join('\n');
}

/**
 * Generate FEATURES_INDEX.md (structured for agents)
 */
function generateFeaturesIndex(features) {
  const lines = [
    '# Features Index',
    '',
    '> Structured index for AI agents. Auto-generated from features directory.',
    '',
    '## Quick Reference',
    '',
    '```yaml',
    'features:',
  ];

  for (const f of features) {
    lines.push(`  ${f.id}:`);
    lines.push(`    name: "${f.name}"`);
    lines.push(`    status: "${f.status}"`);
    lines.push(`    path: "features/${f.name}/"`);
    if (f.tools?.length) {
      lines.push(`    tools: [${f.tools.map(t => `"${t.name}"`).join(', ')}]`);
    }
    if (f.skills) {
      lines.push(`    skills: ["${f.skills}"]`);
    }
  }

  lines.push('```');
  lines.push('');
  lines.push('## Feature Documents');
  lines.push('');

  for (const f of features) {
    lines.push(`### ${f.id}`);
    lines.push('');
    lines.push('| Document | Purpose | Path |');
    lines.push('|----------|---------|------|');

    const docPurposes = {
      'README.md': 'Overview and quick reference',
      'scope.md': 'Feature boundaries and dependencies',
      'acceptance-criteria.md': 'Definition of Done',
      'agent-instructions.md': 'Implementation guide',
      'tool-contracts.md': 'Tool input/output specifications'
    };

    for (const doc of f.documents) {
      const purpose = docPurposes[doc.name] || 'Documentation';
      lines.push(`| ${doc.name} | ${purpose} | ${doc.path} |`);
    }
    lines.push('');
  }

  lines.push('## Tools by Feature');
  lines.push('');
  lines.push('| Tool | Feature | Operation |');
  lines.push('|------|---------|-----------|');

  for (const f of features) {
    if (f.tools?.length) {
      for (const tool of f.tools) {
        lines.push(`| \`${tool.name}\` | ${f.id} | ${tool.purpose} |`);
      }
    }
  }

  lines.push('');
  lines.push(`*Generated: ${new Date().toISOString().split('T')[0]}*`);

  return lines.join('\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('Generating Capabilities Index');
  console.log('============================');
  console.log('');
  console.log('Scanning features directory...');

  const features = await scanFeatures();

  console.log('');
  console.log(`Found ${features.length} features`);
  console.log('');

  // Generate CAPABILITIES.md
  console.log('Generating CAPABILITIES.md...');
  const capabilities = generateCapabilities(features);
  await writeFile(join(ROOT_DIR, 'CAPABILITIES.md'), capabilities);
  console.log('  ✓ CAPABILITIES.md');

  // Generate FEATURES_INDEX.md
  console.log('Generating FEATURES_INDEX.md...');
  const index = generateFeaturesIndex(features);
  await writeFile(join(ROOT_DIR, 'FEATURES_INDEX.md'), index);
  console.log('  ✓ FEATURES_INDEX.md');

  console.log('');
  console.log('Done!');
}

main().catch(console.error);
