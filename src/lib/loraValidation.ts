// src/lib/loraValidation.ts

export interface LoRAValidationResult {
  valid: boolean;
  error?: string;
}

const VALID_EXTENSIONS = ['.safetensors', '.ckpt'];
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB in bytes

/**
 * Validates a LoRA file based on extension and size
 * @param file - File object (browser) or file info (server)
 * @param fileSize - File size in bytes (for server-side validation)
 * @returns Validation result with error message if invalid
 */
export function validateLoRAFile(
  file: File | { name: string; size?: number },
  fileSize?: number
): LoRAValidationResult {
  const fileName = file.name;
  const size = fileSize ?? ('size' in file ? file.size : 0);

  // Check file extension
  const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  if (!VALID_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file extension. Please upload a ${VALID_EXTENSIONS.join(' or ')} file`,
    };
  }

  // Check file size
  if (size > MAX_FILE_SIZE) {
    const maxSizeGB = MAX_FILE_SIZE / (1024 * 1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds ${maxSizeGB}GB limit`,
    };
  }

  return { valid: true };
}

/**
 * Client-side validation helper for file input
 * @param file - File from input element
 * @returns Validation result
 */
export function validateLoRAFileClient(file: File): LoRAValidationResult {
  return validateLoRAFile(file);
}

/**
 * Server-side validation helper with detailed error messages
 * @param fileName - Name of the file
 * @param fileSize - Size of the file in bytes
 * @returns Validation result with detailed error message
 */
export function validateLoRAFileServer(
  fileName: string,
  fileSize: number
): LoRAValidationResult {
  const result = validateLoRAFile({ name: fileName, size: fileSize }, fileSize);
  
  if (!result.valid && result.error) {
    // Add more context for server-side errors
    return {
      valid: false,
      error: `Server validation failed: ${result.error}`,
    };
  }
  
  return result;
}
