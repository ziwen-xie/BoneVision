/**
 * Mapping service for region-to-bone associations
 * 
 * This service provides the mapping between X-ray image regions and 3D bone meshes,
 * enabling synchronized highlighting and educational content display.
 */

import type { MappingConfig, PolygonRegion, BoneInfo, Point } from '../types';
import { isPointInPolygon } from '../utils/geometry';
import type * as THREE from 'three';

/**
 * Cache for loaded mapping configurations to avoid redundant network requests
 */
const mappingCache: Map<string, MappingConfig> = new Map();

/**
 * Loads the bone mapping configuration for a specific body part from JSON.
 * 
 * The mapping configuration includes polygon regions for X-ray images, mesh IDs
 * for 3D models, and educational content for each bone.
 * 
 * @param bodyPart - The body part identifier (e.g., 'foot')
 * @returns Promise resolving to the mapping configuration
 * @throws Error if the mapping file cannot be loaded or parsed
 * 
 * @example
 * const config = await loadMapping('foot');
 * console.log(`Loaded ${config.bones.length} bone mappings`);
 */
export async function loadMapping(bodyPart: string): Promise<MappingConfig> {
  // Check cache first
  const cached = mappingCache.get(bodyPart);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}config/${bodyPart}-mapping.json`);
    
    if (!response.ok) {
      throw new Error(`Failed to load mapping: ${response.statusText}`);
    }

    const config: MappingConfig = await response.json();
    
    // Validate basic structure
    if (!config.bodyPart || !config.bones || !Array.isArray(config.bones)) {
      throw new Error('Invalid mapping configuration structure');
    }

    // Cache the configuration
    mappingCache.set(bodyPart, config);
    
    return config;
  } catch (error) {
    console.error(`Error loading mapping for ${bodyPart}:`, error);
    throw new Error(
      `Unable to load bone mapping configuration for ${bodyPart}. ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Determines which bone (if any) a point on the X-ray image belongs to.
 * 
 * Uses the point-in-polygon ray casting algorithm to detect if the given
 * coordinates fall within any bone's defined region. Coordinates should be
 * in the display coordinate system (actual pixel position on screen).
 * 
 * @param x - X coordinate in display pixels
 * @param y - Y coordinate in display pixels
 * @param config - The mapping configuration
 * @param displayWidth - Current display width of the X-ray image
 * @param displayHeight - Current display height of the X-ray image
 * @returns The bone ID if point is in a region, null otherwise
 * 
 * @example
 * const boneId = getBoneAtPoint(250, 450, config, 960, 540);
 * if (boneId) {
 *   console.log(`Hovering over: ${boneId}`);
 * }
 */
export function getBoneAtPoint(
  x: number,
  y: number,
  config: MappingConfig,
  displayWidth: number,
  displayHeight: number
): string | null {
  const point: Point = { x, y };
  
  // Calculate scale factors from reference to display dimensions
  const scaleX = displayWidth / config.xrayDimensions.width;
  const scaleY = displayHeight / config.xrayDimensions.height;

  // Check each bone region
  for (const bone of config.bones) {
    // Scale the polygon coordinates to display dimensions
    const scaledCoords = bone.xrayRegion.coordinates.map(
      ([refX, refY]) => ({ x: refX * scaleX, y: refY * scaleY })
    );

    // Test if point is inside this bone's region
    if (isPointInPolygon(point, scaledCoords)) {
      return bone.id;
    }
  }

  return null;
}

/**
 * Retrieves the X-ray region definition for a specific bone.
 * 
 * This is used for reverse lookup - when you know the bone ID and need
 * to find its corresponding region on the X-ray image.
 * 
 * @param boneId - The unique bone identifier
 * @param config - The mapping configuration
 * @returns The polygon region or null if bone not found
 * 
 * @example
 * const region = getRegionForBone('calcaneus', config);
 * if (region) {
 *   // Draw highlight using region.coordinates
 * }
 */
export function getRegionForBone(
  boneId: string,
  config: MappingConfig
): PolygonRegion | null {
  const bone = config.bones.find((b) => b.id === boneId);
  return bone ? bone.xrayRegion : null;
}

/**
 * Retrieves educational information for a specific bone.
 * 
 * Returns the bone's name, function description, and common injuries/conditions.
 * This information is displayed in the educational panel when a bone is selected
 * or hovered.
 * 
 * @param boneId - The unique bone identifier
 * @param config - The mapping configuration
 * @returns Bone information or null if bone not found
 * 
 * @example
 * const info = getBoneInfo('talus', config);
 * if (info) {
 *   console.log(info.name); // "Talus (Ankle Bone)"
 *   console.log(info.function); // Description...
 *   console.log(info.commonInjuries); // ["Talar fracture", ...]
 * }
 */
export function getBoneInfo(
  boneId: string,
  config: MappingConfig
): BoneInfo | null {
  const bone = config.bones.find((b) => b.id === boneId);
  
  if (!bone) {
    return null;
  }

  // Return only the educational information fields
  return {
    id: bone.id,
    name: bone.name,
    function: bone.function,
    commonInjuries: bone.commonInjuries,
    xrayStatus: bone.xrayStatus,
    xrayNote: bone.xrayNote,
  };
}

/**
 * Validates that all mesh IDs referenced in the mapping configuration
 * exist in the provided 3D model scene.
 * 
 * This helps catch configuration errors where the mapping references
 * bones that don't exist in the actual 3D model file.
 * 
 * @param config - The mapping configuration to validate
 * @param scene - The loaded 3D model scene (THREE.Group)
 * @returns Validation result with list of missing meshes
 * 
 * @example
 * const model = await loadModel('foot');
 * const validation = validateMapping(config, model);
 * if (!validation.valid) {
 *   console.error('Missing meshes:', validation.missingMeshes);
 * }
 */
export function validateMapping(
  config: MappingConfig,
  scene: THREE.Group
): {
  valid: boolean;
  missingMeshes: string[];
  totalBones: number;
  validBones: number;
} {
  const missingMeshes: string[] = [];
  const availableMeshNames = new Set<string>();

  // Collect all mesh names from the scene
  scene.traverse((child) => {
    if ('isMesh' in child && child.isMesh) {
      availableMeshNames.add(child.name);
    }
  });

  // Check each bone's mesh ID
  for (const bone of config.bones) {
    if (!availableMeshNames.has(bone.meshId)) {
      missingMeshes.push(bone.meshId);
    }
  }

  return {
    valid: missingMeshes.length === 0,
    missingMeshes,
    totalBones: config.bones.length,
    validBones: config.bones.length - missingMeshes.length,
  };
}

/**
 * Gets the highlight color for a specific bone.
 * 
 * @param boneId - The unique bone identifier
 * @param config - The mapping configuration
 * @returns Hex color string or null if bone not found
 * 
 * @example
 * const color = getHighlightColor('calcaneus', config);
 * // Returns "#FF6B6B"
 */
export function getHighlightColor(
  boneId: string,
  config: MappingConfig
): string | null {
  const bone = config.bones.find((b) => b.id === boneId);
  return bone ? bone.highlightColor : null;
}

/**
 * Gets the mesh ID for a specific bone.
 * 
 * @param boneId - The unique bone identifier
 * @param config - The mapping configuration
 * @returns Mesh ID string or null if bone not found
 * 
 * @example
 * const meshId = getMeshId('talus', config);
 * // Returns "Talus"
 */
export function getMeshId(
  boneId: string,
  config: MappingConfig
): string | null {
  const bone = config.bones.find((b) => b.id === boneId);
  return bone ? bone.meshId : null;
}

/**
 * Clears the mapping configuration cache.
 * 
 * This is useful for testing or when you need to force a reload
 * of the configuration.
 */
export function clearMappingCache(): void {
  mappingCache.clear();
}

/**
 * Gets all bone IDs from the mapping configuration.
 * 
 * @param config - The mapping configuration
 * @returns Array of bone IDs
 * 
 * @example
 * const boneIds = getAllBoneIds(config);
 * // Returns ['calcaneus', 'talus', 'navicular', ...]
 */
export function getAllBoneIds(config: MappingConfig): string[] {
  return config.bones.map((bone) => bone.id);
}
