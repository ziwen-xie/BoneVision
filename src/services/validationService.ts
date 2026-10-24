/**
 * Validation Service
 * 
 * Provides file and image validation functions for X-ray uploads.
 * Validates file type, file size, and image dimensions according to system constraints.
 * Dimension checks are orientation-agnostic - see `validateImageDimensions`.
 * 
 * Requirements: 1.1, 1.2, 1.5, 14.1
 */

import {
  ValidationResult,
  ERROR_MESSAGES,
  FILE_CONSTRAINTS,
} from '../types';

/**
 * Validates an uploaded file for type and size constraints.
 * 
 * Checks:
 * - File type is one of: JPEG, PNG, or DICOM
 * - File size does not exceed 10MB
 * 
 * @param file - The file to validate
 * @returns ValidationResult with valid flag and optional error message
 */
export function validateFile(file: File): ValidationResult {
  // Check file type by extension and MIME type
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();
  
  const hasValidExtension = FILE_CONSTRAINTS.ACCEPTED_FORMATS.some(
    (format) => fileName.endsWith(format)
  );
  
  const hasValidMimeType = FILE_CONSTRAINTS.ACCEPTED_MIME_TYPES.some(
    (mimeType) => fileType === mimeType.toLowerCase()
  );
  
  if (!hasValidExtension && !hasValidMimeType) {
    return {
      valid: false,
      errorMessage: ERROR_MESSAGES.INVALID_FORMAT,
    };
  }
  
  // Check file size (max 10MB)
  if (file.size > FILE_CONSTRAINTS.MAX_FILE_SIZE) {
    return {
      valid: false,
      errorMessage: ERROR_MESSAGES.FILE_TOO_LARGE,
    };
  }
  
  return {
    valid: true,
  };
}

/**
 * The 4K budget expressed as edge lengths rather than as width and height.
 *
 * `FILE_CONSTRAINTS` names its limits MAX_IMAGE_WIDTH/MAX_IMAGE_HEIGHT, which
 * only describes a landscape frame. Radiographs are frequently portrait, so the
 * same two numbers are read here as the longer and the shorter edge.
 */
const MAX_LONG_EDGE = Math.max(
  FILE_CONSTRAINTS.MAX_IMAGE_WIDTH,
  FILE_CONSTRAINTS.MAX_IMAGE_HEIGHT
);
const MAX_SHORT_EDGE = Math.min(
  FILE_CONSTRAINTS.MAX_IMAGE_WIDTH,
  FILE_CONSTRAINTS.MAX_IMAGE_HEIGHT
);

/**
 * Validates that an image is no larger than a 4K frame, in either orientation.
 *
 * The limit is on edge lengths, not on width and height specifically: the
 * longer edge may be up to 3840px and the shorter up to 2160px, whichever way
 * round the image is. A 3840x2160 landscape image and a 2160x3840 portrait one
 * are both the same number of pixels and both pass.
 *
 * This is deliberately orientation-agnostic. Comparing width against 3840 and
 * height against 2160 reads "4K" as landscape-only and turns away ordinary
 * portrait radiographs - including this project's own demo foot X-ray
 * (1061x2431, about 2.6 megapixels), which failed a check meant to stop images
 * three times that size. Foot, hand and spine films are routinely taller than
 * they are wide.
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns ValidationResult with valid flag and optional error message
 */
export function validateImageDimensions(
  width: number,
  height: number
): ValidationResult {
  const longEdge = Math.max(width, height);
  const shortEdge = Math.min(width, height);

  if (longEdge > MAX_LONG_EDGE || shortEdge > MAX_SHORT_EDGE) {
    return {
      valid: false,
      errorMessage: ERROR_MESSAGES.IMAGE_TOO_LARGE,
    };
  }
  
  return {
    valid: true,
  };
}

/**
 * Validation service object implementing the ValidationService interface.
 * Provides a structured API for all validation operations.
 */
export const validationService = {
  validateFile,
  validateImageDimensions,
};

export default validationService;
