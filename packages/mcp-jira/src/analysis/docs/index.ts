/**
 * Documentation Generator Module
 *
 * Extracts and generates documentation from Jira issues.
 */

// Types
export type {
  DocType,
  DocFormat,
  DocSection,
  DocSpec,
  ADRSpec,
  TestSpec,
  TestScenario,
  DocGenerationOptions,
  GeneratedDoc,
} from "./types.js";

// Content Extractor
export {
  extractDocSpec,
  mergeDocSpecs,
  validateDocSpec,
} from "./extractor.js";

// Template Engine
export {
  applyTemplate,
  generateDocument,
} from "./template-engine.js";
