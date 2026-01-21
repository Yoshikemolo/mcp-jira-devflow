/**
 * Input validation utilities.
 *
 * Placeholder - implementation to follow.
 */

import { z } from "zod";

export { z };

/**
 * Result of a validation operation.
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] };

/**
 * Validates input against a Zod schema.
 */
export function validateInput<T>(
  schema: z.ZodType<T>,
  input: unknown
): ValidationResult<T> {
  const result = schema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
  };
}
