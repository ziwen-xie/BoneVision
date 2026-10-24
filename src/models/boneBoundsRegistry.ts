/**
 * Bone bounding-box registry.
 *
 * A module-level store of plain-number geometry facts that the 3D layer publishes and the
 * Zustand store consumes.
 *
 * Why a registry instead of store state
 * -------------------------------------
 * `focusBone` needs the geometry of the bone it is framing, but the geometry only exists
 * once React Three Fiber has built the skeleton. Three options were on the table:
 *
 * 1. Import the skeleton builder into the store. Rejected: it would drag Three.js (and a
 *    GPU-resource lifecycle) into state management, and the store would be rebuilding
 *    geometry that the view layer already owns.
 * 2. Put `THREE.Box3` objects in store state. Rejected: Zustand state should stay plain
 *    and comparable. Every subscriber would re-run on a mutable object whose identity
 *    says nothing useful, and the store would hold references to disposed GPU resources
 *    after the viewer unmounts.
 * 3. This registry. The 3D layer owns the meshes and converts them *once* (on build) into
 *    numbers; the store reads those numbers synchronously inside `focusBone`. No Three.js
 *    import in the store, no render-triggering state, and the registry is cleared on
 *    unmount so a stale foot cannot be framed after a mode switch.
 *
 * Bounding boxes are taken straight from `mesh.geometry.boundingBox`, which is valid in
 * world space here because `buildFootSkeleton` bakes each mesh's transform into its
 * geometry and leaves the group matrix as identity.
 *
 * Requirements: 2.6, 4.5, 4.6
 */

import type { Bounds } from '../utils/cameraFraming';

/** Bounding boxes keyed by mapping-config bone `id` (not `meshId`). */
let boneBounds: ReadonlyMap<string, Bounds> = new Map();

/** Bounding box enclosing every registered bone, or `null` when nothing is registered. */
let skeletonBounds: Bounds | null = null;

/**
 * Aspect ratio (width / height) of the 3D viewport.
 *
 * Framing distance depends on it, and the store has no access to the canvas, so the 3D
 * layer keeps it up to date here. Defaults to 1, which is the conservative square case.
 */
let viewportAspect = 1;

/**
 * Publishes the bone geometry of the mounted skeleton.
 *
 * @param bounds - Per-bone boxes keyed by bone `id`
 * @param combined - Box enclosing the whole skeleton, used for auto-framing on load
 */
export function registerBoneBounds(
  bounds: ReadonlyMap<string, Bounds>,
  combined: Bounds | null
): void {
  boneBounds = bounds;
  skeletonBounds = combined;
}

/** Drops all registered geometry. Called when the 3D viewer unmounts. */
export function clearBoneBounds(): void {
  boneBounds = new Map();
  skeletonBounds = null;
}

/** Records the current 3D viewport aspect ratio. Ignores non-finite or zero values. */
export function setViewportAspect(aspect: number): void {
  if (Number.isFinite(aspect) && aspect > 0) {
    viewportAspect = aspect;
  }
}

export function getViewportAspect(): number {
  return viewportAspect;
}

/** Bounding box of a single bone, or `null` if the skeleton is not mounted. */
export function getBoneBounds(boneId: string): Bounds | null {
  return boneBounds.get(boneId) ?? null;
}

/** Bounding box of the whole skeleton, or `null` if the skeleton is not mounted. */
export function getSkeletonBounds(): Bounds | null {
  return skeletonBounds;
}

/** Number of registered bones. Useful for diagnostics and tests. */
export function getRegisteredBoneCount(): number {
  return boneBounds.size;
}
