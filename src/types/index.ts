/**
 * Core type definitions for SkeletonMap application
 */

import * as THREE from 'three';

// ============================================================================
// Domain Models
// ============================================================================

export interface Point {
  x: number;
  y: number;
}

export interface PolygonRegion {
  type: 'polygon';
  coordinates: [number, number][]; // [x, y] pairs in image pixel coordinates
}

/**
 * The rectangle an image actually occupies inside its container after
 * aspect-ratio-preserving fitting. All values are CSS pixels, with offsets
 * relative to the container's top-left corner. Interactive overlays align to
 * this box.
 */
export interface RenderedImageBox {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export interface BoneInfo {
  id: string; // Unique identifier (e.g., "calcaneus")
  name: string; // Display name (e.g., "Calcaneus (Heel Bone)")
  function: string; // Educational description of bone function
  commonInjuries: string[]; // List of common injuries/conditions
  xrayStatus?: string; // Optional status annotation for uploaded X-rays
  xrayNote?: string; // Optional caveat about how well this bone is seen on the current projection
}

export interface BoneMappingEntry extends BoneInfo {
  xrayRegion: PolygonRegion; // Clickable region on X-ray
  meshId: string; // Name of mesh in 3D model scene graph
  highlightColor: string; // Hex color for highlights (e.g., "#FF6B6B")
}

export interface MappingConfig {
  bodyPart: 'foot' | 'hand' | 'knee'; // Body part identifier
  xrayDimensions: { width: number; height: number }; // Reference dimensions
  bones: BoneMappingEntry[]; // Array of bone mappings
}

export interface ImageData {
  url: string; // Data URL or object URL for display
  width: number; // Image width in pixels
  height: number; // Image height in pixels
  format: 'jpeg' | 'png' | 'dicom'; // Original format
}

// ============================================================================
// State Management
// ============================================================================

export interface SkeletonMapStore {
  // Interaction state
  selectedBoneId: string | null;
  hoveredBoneId: string | null;

  // Application mode
  mode: 'demo' | 'upload';
  bodyPart: 'foot' | null;

  // X-ray viewer state
  xrayImage: ImageData | null;
  xrayScale: number; // Scale factor for coordinate mapping

  // 3D viewer state
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  isAnimatingCamera: boolean;

  // Configuration
  mappingConfig: MappingConfig | null;

  // Loading and error state
  isLoadingModel: boolean;
  isLoadingXray: boolean;
  errorMessage: string | null;

  // Actions
  setSelectedBone: (id: string | null) => void;
  setHoveredBone: (id: string | null) => void;
  /**
   * Switch modes. Delegates to `initializeDemo` or `prepareUpload`, so callers
   * only have to set the flag; re-asserting the current mode is a no-op.
   */
  setMode: (mode: 'demo' | 'upload') => void;
  /**
   * Load the demo content (foot bone map + sample X-ray) and enter demo mode.
   * Resolves once both have settled; failures surface as `errorMessage` rather
   * than a rejection, since the callers are mount effects and click handlers.
   */
  initializeDemo: () => Promise<void>;
  /**
   * Enter upload mode and clear the demo X-ray, its bone map and any
   * selection, so demo anatomy is never shown over the user's own image.
   */
  prepareUpload: () => void;
  loadXray: (image: File | string) => Promise<void>;
  setBodyPart: (part: 'foot') => Promise<void>;
  focusBone: (boneId: string) => void;
  /**
   * Position the camera so the whole bone model is in view. Called by the 3D
   * layer once the model's geometry is known; snaps unless `animate` is set.
   */
  frameModel: (options?: { animate?: boolean }) => void;
  clearError: () => void;
  reset: () => void;
}

// ============================================================================
// Component Props
// ============================================================================

export interface XRayViewerProps {
  className?: string;
}

export interface ModelViewerProps {
  className?: string;
}

export interface EducationalPanelProps {
  className?: string;
}

export interface UploadHandlerProps {
  onUploadComplete: () => void;
}

/**
 * The interactive overlay reads bone regions and hover/selection state straight
 * from the store, so it only needs the geometry of the rendered image box it
 * must align to. Dimensions are CSS pixels.
 */
export interface InteractiveOverlayProps {
  width: number; // Rendered width of the X-ray image box
  height: number; // Rendered height of the X-ray image box
  className?: string;
}

export interface BoneModelGroupProps {
  modelPath: string;
  selectedBoneId: string | null;
  hoveredBoneId: string | null;
  onBoneClick: (boneId: string) => void;
  onBoneHover: (boneId: string | null) => void;
}

// ============================================================================
// Service Interfaces
// ============================================================================

export interface ImageService {
  loadImage(file: File): Promise<ImageData>;
  loadImageFromUrl(url: string): Promise<ImageData>;
  parseDICOM(file: File): Promise<ImageData>;
}

export interface ModelService {
  loadModel(bodyPart: string): Promise<THREE.Group>;
  extractBoneMeshes(scene: THREE.Group): Map<string, THREE.Mesh>;
  applyHighlight(mesh: THREE.Mesh, color: string, intensity: number): void;
  removeHighlight(mesh: THREE.Mesh): void;
}

export interface MappingService {
  loadMapping(bodyPart: string): Promise<MappingConfig>;
  getBoneAtPoint(x: number, y: number, scale: number): string | null;
  getRegionForBone(boneId: string): PolygonRegion | null;
  getBoneInfo(boneId: string): BoneInfo | null;
  validateMapping(config: MappingConfig, scene: THREE.Group): ValidationResult;
}

export interface ValidationService {
  validateFile(file: File): ValidationResult;
  validateImageDimensions(width: number, height: number): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errorMessage?: string;
}

// ============================================================================
// Event Handlers
// ============================================================================

export type BoneEventHandler = (boneId: string | null) => void;
export type CameraAnimationCompleteHandler = () => void;
export type ErrorHandler = (error: Error) => void;

// ============================================================================
// Constants
// ============================================================================

export const ERROR_MESSAGES = {
  INVALID_FORMAT: 'Please upload a JPEG, PNG, or DICOM (.dcm) file.',
  FILE_TOO_LARGE: 'File size exceeds 10MB limit. Please upload a smaller image.',
  IMAGE_TOO_LARGE: 'Image dimensions exceed 4K resolution. Please use a smaller image.',
  DICOM_PARSE_ERROR: 'Unable to parse DICOM file. The file may be corrupted.',
  NETWORK_ERROR: 'Unable to load resources. Please check your internet connection.',
  WEBGL_NOT_SUPPORTED:
    'Your browser does not support WebGL. Please update your browser to use SkeletonMap.',
  MODEL_LOAD_ERROR: 'Unable to load 3D model. Please try again.',
  MAPPING_LOAD_ERROR: 'Unable to load bone mapping configuration.',
} as const;

export const FILE_CONSTRAINTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_WIDTH: 3840, // 4K width
  MAX_IMAGE_HEIGHT: 2160, // 4K height
  ACCEPTED_FORMATS: ['.jpg', '.jpeg', '.png', '.dcm'],
  ACCEPTED_MIME_TYPES: ['image/jpeg', 'image/png', 'application/dicom'],
} as const;

export const ANIMATION_DURATIONS = {
  HIGHLIGHT_FADE: 100, // ms
  CAMERA_FOCUS: 500, // ms
  PANEL_TRANSITION: 300, // ms
  LAYOUT_RESIZE: 500, // ms
} as const;

export const PERFORMANCE_TARGETS = {
  MIN_FPS: 30,
  MAX_MODEL_LOAD_TIME: 3000, // ms
  MAX_IMAGE_LOAD_TIME: 2000, // ms
  MAX_INITIAL_LOAD_TIME: 5000, // ms
} as const;
