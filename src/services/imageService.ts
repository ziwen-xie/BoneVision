/**
 * Image Processing Service
 * 
 * Handles image loading, format conversion, and display preparation for X-ray images.
 * Supports JPEG, PNG formats using browser FileReader API.
 * 
 * Requirements: 1.3, 1.4, 7.1, 7.2
 */

import { ImageData } from '../types';

/**
 * Load an image from a File object (user upload)
 * Supports JPEG and PNG formats
 * 
 * @param file - File object from user upload
 * @returns Promise resolving to ImageData with url, dimensions, and format
 * @throws Error if image fails to load or format is unsupported
 */
export async function loadImage(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    // Determine format from file type
    const format = determineFormat(file.type);
    if (!format) {
      reject(new Error(`Unsupported file type: ${file.type}`));
      return;
    }

    // Create FileReader to read file as Data URL
    const reader = new FileReader();

    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Failed to read file'));
        return;
      }

      // Create Image element to get dimensions and validate
      const img = new Image();

      img.onload = () => {
        // Image loaded successfully, create ImageData object
        const imageData: ImageData = {
          url: dataUrl,
          width: img.width,
          height: img.height,
          format,
        };

        resolve(imageData);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image. The file may be corrupted.'));
      };

      // Set src to trigger loading
      img.src = dataUrl;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    // Start reading the file
    reader.readAsDataURL(file);
  });
}

/**
 * Load an image from a URL (demo mode)
 * Used for pre-configured demo X-ray images
 * 
 * @param url - URL or path to image file
 * @returns Promise resolving to ImageData with url, dimensions, and format
 * @throws Error if image fails to load or URL is invalid
 */
export async function loadImageFromUrl(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    // Determine format from URL
    const format = determineFormatFromUrl(url);
    if (!format) {
      reject(new Error(`Unsupported image format in URL: ${url}`));
      return;
    }

    // Create Image element to load from URL
    const img = new Image();

    img.onload = () => {
      // Image loaded successfully, create ImageData object
      const imageData: ImageData = {
        url,
        width: img.width,
        height: img.height,
        format,
      };

      resolve(imageData);
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image from URL: ${url}`));
    };

    // Set src to trigger loading
    img.src = url;
  });
}

/**
 * Determine image format from MIME type
 * 
 * @param mimeType - MIME type string (e.g., 'image/jpeg')
 * @returns Format string or null if unsupported
 */
function determineFormat(mimeType: string): 'jpeg' | 'png' | 'dicom' | null {
  switch (mimeType.toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpeg';
    case 'image/png':
      return 'png';
    case 'application/dicom':
      return 'dicom';
    default:
      return null;
  }
}

/**
 * Determine image format from URL or file path
 * 
 * @param url - URL or file path
 * @returns Format string or null if unsupported
 */
function determineFormatFromUrl(url: string): 'jpeg' | 'png' | 'dicom' | null {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) {
    return 'jpeg';
  }
  if (lowerUrl.endsWith('.png')) {
    return 'png';
  }
  if (lowerUrl.endsWith('.dcm')) {
    return 'dicom';
  }
  
  return null;
}

/**
 * Parse DICOM file (placeholder for future implementation)
 * Currently not implemented - DICOM support will be added in a later task
 * 
 * @param _file - DICOM file (unused - placeholder for future implementation)
 * @returns Promise resolving to ImageData
 * @throws Error indicating DICOM parsing is not yet implemented
 */
export async function parseDICOM(_file: File): Promise<ImageData> {
  // DICOM parsing will be implemented when needed
  // This requires the dicom-parser library which should be installed separately
  throw new Error('DICOM format is not yet supported. Please upload JPEG or PNG images.');
}

/**
 * Image Service API
 * Exports the main functions for external use
 */
export const imageService = {
  loadImage,
  loadImageFromUrl,
  parseDICOM,
};
