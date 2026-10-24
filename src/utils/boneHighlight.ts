/**
 * Emissive highlight stepping for the 3D bone meshes.
 *
 * Extracted from the render component so the fade behaviour is a plain function of
 * (targets, hovered id, selected id, elapsed time): it can be stepped and asserted
 * without a WebGL context, and the component is left with nothing but the frame hook.
 *
 * The highlight colour always comes from the mapping configuration's `highlightColor`,
 * which is the same value the X-ray canvas fills its region with. That shared source is
 * what makes a bone look like the same bone in both views (Requirement 5.5).
 *
 * Requirements: 5.1, 5.2, 5.3, 5.5, 5.6
 */

import type * as THREE from 'three';

/** Emissive intensity for the bone under the pointer. */
export const HOVER_INTENSITY = 0.5;

/**
 * Emissive intensity for the selected bone. Deliberately much weaker than hover so the
 * two states stay distinguishable: hover is the transient "this one, right now" signal,
 * selection is the quieter persistent one.
 */
export const SELECTED_INTENSITY = 0.18;

/**
 * Time constant of the exponential fade, in seconds.
 *
 * An exponential approach covers ~95% of the remaining gap in three time constants, so
 * 0.03s reaches full strength in roughly 90ms: smooth rather than a hard snap, and still
 * inside the 100ms response budget of Requirements 5.1, 5.2 and 5.6.
 */
export const FADE_TIME_CONSTANT = 0.03;

/** Below this gap the fade is finished; snapping avoids an endless asymptotic tail. */
const FADE_EPSILON = 0.004;

/** One highlightable bone: its material, its colour, and its current fade position. */
export interface HighlightTarget {
  boneId: string;
  /** The mesh's own material, or `null` if it is not a standard material. */
  material: THREE.MeshStandardMaterial | null;
  /** Highlight colour from the mapping configuration. */
  highlight: THREE.Color;
  /** Current emissive intensity. Mutated in place by {@link stepHighlights}. */
  intensity: number;
}

/**
 * Emissive intensity a bone should settle at.
 *
 * Hover wins over selection, matching the educational panel, which also shows the hovered
 * bone in preference to the selected one.
 */
export function targetIntensity(
  boneId: string,
  hoveredBoneId: string | null,
  selectedBoneId: string | null
): number {
  if (boneId === hoveredBoneId) {
    return HOVER_INTENSITY;
  }

  if (boneId === selectedBoneId) {
    return SELECTED_INTENSITY;
  }

  return 0;
}

/**
 * Advances every target one frame toward its intensity goal.
 *
 * Only material properties are written - never geometry, never a new material - so this
 * can run every frame without disturbing the render pipeline. Targets already at their
 * goal are skipped, which means an idle scene does no work at all.
 *
 * @param targets - Bones to update, mutated in place
 * @param hoveredBoneId - Currently hovered bone id, from the store
 * @param selectedBoneId - Currently selected bone id, from the store
 * @param delta - Seconds since the previous frame
 */
export function stepHighlights(
  targets: readonly HighlightTarget[],
  hoveredBoneId: string | null,
  selectedBoneId: string | null,
  delta: number
): void {
  if (targets.length === 0) {
    return;
  }

  // Framerate-independent smoothing: the same wall-clock fade at 30 or 144 FPS.
  const blend = 1 - Math.exp(-Math.max(delta, 0) / FADE_TIME_CONSTANT);

  for (const target of targets) {
    const goal = targetIntensity(target.boneId, hoveredBoneId, selectedBoneId);

    if (target.intensity === goal) {
      continue;
    }

    let next = target.intensity + (goal - target.intensity) * blend;

    if (Math.abs(goal - next) < FADE_EPSILON) {
      next = goal;
    }

    target.intensity = next;

    const { material } = target;

    if (!material) {
      continue;
    }

    if (next > 0) {
      material.emissive.copy(target.highlight);
      material.emissiveIntensity = next;
    } else {
      material.emissive.setRGB(0, 0, 0);
      material.emissiveIntensity = 0;
    }
  }
}
