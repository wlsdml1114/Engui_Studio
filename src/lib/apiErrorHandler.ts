/**
 * API Error Handling Utilities
 * Provides standardized error responses and error handling for API routes
 */

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: {
      field?: string;
      value?: unknown;
      constraint?: string;
    };
  };
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

/**
 * Error codes for API responses
 */
export const ErrorCodes = {
  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',
  
  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  
  // Conflict errors (409)
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  
  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number = 500,
  details?: ErrorResponse['error']['details']
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    { status }
  );
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * Handle validation errors
 */
export function handleValidationError(
  message: string,
  field?: string,
  value?: unknown
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    ErrorCodes.VALIDATION_ERROR,
    message,
    400,
    { field, value }
  );
}

/**
 * Handle not found errors
 */
export function handleNotFoundError(
  resource: string,
  id?: string
): NextResponse<ErrorResponse> {
  const message = id
    ? `${resource} with id '${id}' not found`
    : `${resource} not found`;
  
  return createErrorResponse(
    ErrorCodes.NOT_FOUND,
    message,
    404
  );
}

/**
 * Handle database constraint violations
 */
export function handleDatabaseError(
  error: unknown
): NextResponse<ErrorResponse> {
  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        return createErrorResponse(
          ErrorCodes.DUPLICATE_ENTRY,
          'A record with this value already exists',
          409,
          {
            constraint: 'unique',
            field: error.meta?.target as string,
          }
        );
      
      case 'P2003':
        // Foreign key constraint violation
        return createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Referenced record does not exist',
          400,
          {
            constraint: 'foreign_key',
            field: error.meta?.field_name as string,
          }
        );
      
      case 'P2025':
        // Record not found
        return createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Record not found',
          404
        );
      
      default:
        console.error('Prisma error:', error);
        return createErrorResponse(
          ErrorCodes.DATABASE_ERROR,
          'Database operation failed',
          500
        );
    }
  }

  // Handle validation errors from Prisma
  if (error instanceof Prisma.PrismaClientValidationError) {
    return createErrorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid data provided',
      400
    );
  }

  // Generic error
  console.error('Unexpected error:', error);
  return createErrorResponse(
    ErrorCodes.INTERNAL_ERROR,
    'An unexpected error occurred',
    500
  );
}

/**
 * Wrap async API handler with error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ErrorResponse>> {
  return handler().catch((error) => {
    return handleDatabaseError(error);
  });
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: Record<string, unknown>,
  requiredFields: string[]
): NextResponse<ErrorResponse> | null {
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null) {
      return handleValidationError(
        `Missing required field: ${field}`,
        field
      );
    }
  }
  return null;
}

/**
 * Validate field type
 */
export function validateFieldType(
  value: unknown,
  expectedType: string,
  fieldName: string
): NextResponse<ErrorResponse> | null {
  const actualType = typeof value;
  
  if (actualType !== expectedType) {
    return handleValidationError(
      `Field '${fieldName}' must be of type ${expectedType}, got ${actualType}`,
      fieldName,
      value
    );
  }
  
  return null;
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: unknown,
  validValues: readonly T[],
  fieldName: string
): NextResponse<ErrorResponse> | null {
  if (!validValues.includes(value as T)) {
    return handleValidationError(
      `Field '${fieldName}' must be one of: ${validValues.join(', ')}`,
      fieldName,
      value
    );
  }
  
  return null;
}

/**
 * Validate number range
 */
export function validateRange(
  value: unknown,
  min: number,
  max: number,
  fieldName: string
): NextResponse<ErrorResponse> | null {
  if (typeof value !== 'number') {
    return handleValidationError(
      `Field '${fieldName}' must be a number`,
      fieldName,
      value
    );
  }
  
  if (value < min || value > max) {
    return handleValidationError(
      `Field '${fieldName}' must be between ${min} and ${max}`,
      fieldName,
      value
    );
  }
  
  return null;
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(
  value: unknown,
  fieldName: string
): NextResponse<ErrorResponse> | null {
  if (typeof value !== 'number') {
    return handleValidationError(
      `Field '${fieldName}' must be a number`,
      fieldName,
      value
    );
  }
  
  if (value <= 0) {
    return handleValidationError(
      `Field '${fieldName}' must be a positive number`,
      fieldName,
      value
    );
  }
  
  return null;
}

/**
 * Validate non-negative number
 */
export function validateNonNegativeNumber(
  value: unknown,
  fieldName: string
): NextResponse<ErrorResponse> | null {
  if (typeof value !== 'number') {
    return handleValidationError(
      `Field '${fieldName}' must be a number`,
      fieldName,
      value
    );
  }
  
  if (value < 0) {
    return handleValidationError(
      `Field '${fieldName}' must be non-negative`,
      fieldName,
      value
    );
  }
  
  return null;
}

/**
 * Validate string length
 */
export function validateStringLength(
  value: unknown,
  maxLength: number,
  fieldName: string,
  minLength: number = 0
): NextResponse<ErrorResponse> | null {
  if (typeof value !== 'string') {
    return handleValidationError(
      `Field '${fieldName}' must be a string`,
      fieldName,
      value
    );
  }
  
  if (value.length < minLength) {
    return handleValidationError(
      `Field '${fieldName}' must be at least ${minLength} characters`,
      fieldName,
      value
    );
  }
  
  if (value.length > maxLength) {
    return handleValidationError(
      `Field '${fieldName}' must be at most ${maxLength} characters`,
      fieldName,
      value
    );
  }
  
  return null;
}
