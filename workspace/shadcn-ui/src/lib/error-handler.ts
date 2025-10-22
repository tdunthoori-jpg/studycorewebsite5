import { toast } from '@/components/ui/sonner';

interface ErrorWithMessage {
  message: string;
}

/**
 * Type guard for ErrorWithMessage
 */
function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Convert any error to a string message
 */
function toErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  
  // For PostgreSQL or Supabase specific errors
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'details' in error
  ) {
    const pgError = error as { code: string; details: string };
    return `Database error: ${pgError.details || pgError.code}`;
  }
  
  try {
    return String(error);
  } catch {
    return 'Unknown error';
  }
}

/**
 * Handle any error with proper logging and UI feedback
 */
export function handleError(error: unknown, context: string = '', showToast: boolean = true): string {
  const errorMessage = toErrorMessage(error);
  const contextPrefix = context ? `${context}: ` : '';
  const fullMessage = `${contextPrefix}${errorMessage}`;
  
  console.error(fullMessage, error);
  
  if (showToast) {
    toast.error(fullMessage);
  }
  
  return fullMessage;
}

/**
 * Handle a database operation error
 */
export function handleDatabaseError(
  error: unknown,
  operation: string,
  entity: string,
  showToast: boolean = true
): string {
  return handleError(error, `Failed to ${operation} ${entity}`, showToast);
}

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = 
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Validate that an ID is a proper UUID
 * @returns The ID if valid, or throws an error if invalid
 */
export function validateId(id: string | undefined | null, entityName: string = 'entity'): string {
  if (!id) {
    throw new Error(`Missing ${entityName} ID`);
  }
  
  if (!isValidUUID(id)) {
    throw new Error(`Invalid ${entityName} ID format: ${id}`);
  }
  
  return id;
}

/**
 * Show success toast with proper context
 */
export function showSuccess(message: string, operation: string = '', entity: string = ''): void {
  const prefix = operation && entity ? `${operation} ${entity}` : '';
  toast.success(prefix ? `${prefix}: ${message}` : message);
}