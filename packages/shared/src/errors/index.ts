/**
 * Standardized error types.
 *
 * All errors in the system should extend AppError.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "EXTERNAL_SERVICE_ERROR"
  | "INTERNAL_ERROR";

/**
 * Base error class for all application errors.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode = 500,
    isOperational = true
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // V8-specific stack trace capture (Node.js)
    const ErrorWithCapture = Error as typeof Error & {
      captureStackTrace?: (target: object, constructor?: Function) => void;
    };
    ErrorWithCapture.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Error for validation failures.
 */
export class ValidationError extends AppError {
  readonly fields: string[];

  constructor(message: string, fields: string[] = []) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
    this.fields = fields;
  }
}

/**
 * Error for resource not found.
 */
export class NotFoundError extends AppError {
  readonly resource: string;

  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} '${identifier}' not found`
      : `${resource} not found`;
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
    this.resource = resource;
  }
}

/**
 * Error for external service failures.
 */
export class ExternalServiceError extends AppError {
  readonly service: string;

  constructor(service: string, message: string) {
    super(`${service}: ${message}`, "EXTERNAL_SERVICE_ERROR", 502);
    this.name = "ExternalServiceError";
    this.service = service;
  }
}
