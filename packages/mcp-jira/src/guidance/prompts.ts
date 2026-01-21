/**
 * Follow-up Prompt Generator
 *
 * Generates contextually relevant follow-up prompts based on
 * issue analysis results.
 */

import type {
  IssueContext,
  Recommendation,
  WorkflowAction,
  FollowUpPrompt,
  PromptCategory,
} from "./types.js";

/**
 * Creates a follow-up prompt.
 */
function createPrompt(
  prompt: string,
  description: string,
  category: PromptCategory
): FollowUpPrompt {
  return { prompt, description, category };
}

/**
 * Generates prompts based on recommendations.
 */
function generateRecommendationPrompts(
  context: IssueContext,
  recommendations: readonly Recommendation[]
): FollowUpPrompt[] {
  const prompts: FollowUpPrompt[] = [];
  const seen = new Set<string>();

  for (const rec of recommendations) {
    // Generate prompt based on recommendation title/category
    const title = rec.title.toLowerCase();

    if (title.includes("acceptance criteria") && !seen.has("ac")) {
      seen.add("ac");
      prompts.push(
        createPrompt(
          `Help me write acceptance criteria for ${context.key}`,
          "Generate clear acceptance criteria using Given/When/Then format",
          "action"
        )
      );
    }

    if (title.includes("user story format") && !seen.has("usformat")) {
      seen.add("usformat");
      prompts.push(
        createPrompt(
          `Convert ${context.key} to user story format`,
          "Rewrite the issue summary in user story format",
          "refinement"
        )
      );
    }

    if (title.includes("reproduction steps") && !seen.has("repro")) {
      seen.add("repro");
      prompts.push(
        createPrompt(
          `Help me write reproduction steps for ${context.key}`,
          "Generate clear numbered reproduction steps for this bug",
          "action"
        )
      );
    }

    if (title.includes("environment") && !seen.has("env")) {
      seen.add("env");
      prompts.push(
        createPrompt(
          `What environment information should I include for ${context.key}?`,
          "Get guidance on which environment details to capture",
          "research"
        )
      );
    }

    if (title.includes("expected") && !seen.has("expected")) {
      seen.add("expected");
      prompts.push(
        createPrompt(
          `Help me clarify expected vs actual behavior for ${context.key}`,
          "Structure the expected and actual behavior clearly",
          "action"
        )
      );
    }

    if (title.includes("description") && !seen.has("desc")) {
      seen.add("desc");
      prompts.push(
        createPrompt(
          `Help me write a description for ${context.key}`,
          "Generate an appropriate description for this issue",
          "action"
        )
      );
    }

    if (title.includes("business value") && !seen.has("value")) {
      seen.add("value");
      prompts.push(
        createPrompt(
          `Help me articulate the business value of ${context.key}`,
          "Clarify the business goals and expected outcomes",
          "refinement"
        )
      );
    }

    if (title.includes("stale") && !seen.has("stale")) {
      seen.add("stale");
      prompts.push(
        createPrompt(
          `What should I update about ${context.key}'s progress?`,
          "Get suggestions for a meaningful progress update",
          "research"
        )
      );
    }
  }

  return prompts;
}

/**
 * Generates prompts based on workflow actions.
 */
function generateWorkflowPrompts(
  context: IssueContext,
  actions: readonly WorkflowAction[]
): FollowUpPrompt[] {
  const prompts: FollowUpPrompt[] = [];
  const seen = new Set<string>();

  for (const action of actions) {
    const actionText = action.action.toLowerCase();

    if (actionText.includes("refinement") && !seen.has("refine")) {
      seen.add("refine");
      prompts.push(
        createPrompt(
          `What questions should I ask during refinement of ${context.key}?`,
          "Get a list of refinement questions for this issue",
          "refinement"
        )
      );
    }

    if (actionText.includes("triage") && !seen.has("triage")) {
      seen.add("triage");
      prompts.push(
        createPrompt(
          `Help me triage ${context.key}`,
          "Get guidance on priority and severity assessment",
          "action"
        )
      );
    }

    if (actionText.includes("blocker") && !seen.has("blocker")) {
      seen.add("blocker");
      prompts.push(
        createPrompt(
          `What common blockers should I check for ${context.key}?`,
          "Get a checklist of potential impediments",
          "research"
        )
      );
    }

    if (actionText.includes("root cause") && !seen.has("rca")) {
      seen.add("rca");
      prompts.push(
        createPrompt(
          `Help me document the root cause for ${context.key}`,
          "Structure a root cause analysis summary",
          "review"
        )
      );
    }

    if (actionText.includes("documentation") && !seen.has("docs")) {
      seen.add("docs");
      prompts.push(
        createPrompt(
          `What documentation should I update after completing ${context.key}?`,
          "Identify documentation that may need updates",
          "review"
        )
      );
    }

    if (actionText.includes("outcome") && !seen.has("outcome")) {
      seen.add("outcome");
      prompts.push(
        createPrompt(
          `Help me evaluate the outcomes of ${context.key}`,
          "Review if the issue achieved its goals",
          "review"
        )
      );
    }
  }

  return prompts;
}

/**
 * Generates generic prompts based on issue type.
 */
function generateTypePrompts(context: IssueContext): FollowUpPrompt[] {
  const prompts: FollowUpPrompt[] = [];
  const type = context.issueType.toLowerCase();

  if (type === "story") {
    prompts.push(
      createPrompt(
        `Break down ${context.key} into subtasks`,
        "Create a subtask breakdown for this story",
        "action"
      )
    );
  }

  if (type === "epic") {
    prompts.push(
      createPrompt(
        `Suggest stories for ${context.key}`,
        "Generate potential child stories for this epic",
        "action"
      )
    );
  }

  if (type === "bug") {
    prompts.push(
      createPrompt(
        `Suggest test cases based on ${context.key}`,
        "Generate test cases to prevent regression",
        "review"
      )
    );
  }

  return prompts;
}

/**
 * Generates a general issue research prompt.
 */
function generateResearchPrompt(context: IssueContext): FollowUpPrompt {
  return createPrompt(
    `Tell me more about ${context.key}`,
    "Get detailed information about this issue",
    "research"
  );
}

/**
 * Generates follow-up prompts based on analysis results.
 *
 * @param context - Issue context
 * @param recommendations - Filtered recommendations
 * @param actions - Filtered workflow actions
 * @param level - Detail level
 * @returns Array of follow-up prompts
 */
export function generateFollowUpPrompts(
  context: IssueContext,
  recommendations: readonly Recommendation[],
  actions: readonly WorkflowAction[],
  level: string
): FollowUpPrompt[] {
  const prompts: FollowUpPrompt[] = [];

  // Always include research prompt
  prompts.push(generateResearchPrompt(context));

  // Generate from recommendations
  const recPrompts = generateRecommendationPrompts(context, recommendations);
  prompts.push(...recPrompts);

  // Generate from workflow actions
  const wfPrompts = generateWorkflowPrompts(context, actions);
  prompts.push(...wfPrompts);

  // Generate type-specific prompts
  const typePrompts = generateTypePrompts(context);
  prompts.push(...typePrompts);

  // Limit based on detail level
  let maxPrompts: number;
  switch (level) {
    case "minimal":
      maxPrompts = 3;
      break;
    case "verbose":
      maxPrompts = 10;
      break;
    default:
      maxPrompts = 5;
  }

  // Deduplicate and limit
  const seen = new Set<string>();
  const uniquePrompts: FollowUpPrompt[] = [];

  for (const p of prompts) {
    if (!seen.has(p.prompt) && uniquePrompts.length < maxPrompts) {
      seen.add(p.prompt);
      uniquePrompts.push(p);
    }
  }

  return uniquePrompts;
}
