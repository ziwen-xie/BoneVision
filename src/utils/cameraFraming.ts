/**
 * Camera framing math for the 3D viewer.
 *
 * Pure arithmetic on plain number tuples - deliberately free of any Three.js import so
 * the Zustand store can frame the camera without depending on the render layer. The 3D
 * layer publishes bounding boxes as numbers (see `models/boneBoundsRegistry`), the store
 * turns them into a camera position with the helpers below, and `CameraAnimator` is the
 * only place that touches an actual `THREE.Camera`.
 *
 * The camera constants live here too, because two things must never disagree: the clamps
 * `OrbitControls` enforces and the distances {@link computeFraming} produces. If a focus
 * distance fell below `minDistance`, the controls would yank the camera back on the
 * user's next drag and the animation would look broken.
 *
 * Requirements: 4.4, 4.5, 4.6
 */

/** Vertical field of view of the scene camera, in degrees. */
export const CAMERA_FOV = 50;

/** Camera position before auto-framing runs (Requirement 4.5 replaces it on load). */
export const CAMERA_INITIAL_POSITION: readonly [number, number, number] = [0, 5, 10];

/**
 * Orbit distance clamps, in model units (the foot skeleton is ~26 long, ~10 wide, ~6 tall).
 *
 * The minimum sits just below the tightest single-bone framing distance (~3.7 for the
 * sesamoids) so zooming in stops short of entering a bone. The maximum clears the
 * whole-foot framing distance (~37) with room to spare, including the extra pull-back a
 * narrow portrait viewport needs, so framing is never cut short by the clamp.
 */
export const CAMERA_MIN_DISTANCE = 3;
export const CAMERA_MAX_DISTANCE = 90;

/**
 * Polar angle clamps. Stopping short of either pole keeps the view from flipping over the
 * top or sliding underneath the plantar surface, where the orbit axis inverts and
 * dragging suddenly reverses direction.
 */
export const CAMERA_MIN_POLAR_ANGLE = Math.PI * 0.06;
export const CAMERA_MAX_POLAR_ANGLE = Math.PI * 0.85;

/** Padding multiplier when framing the entire skeleton: a little air around the foot. */
export const MODEL_FRAME_PADDING = 1.2;

/**
 * Padding multiplier when focusing a single bone. Much larger than the whole-model value
 * on purpose: a phalanx filling the viewport edge-to-edge loses all anatomical context,
 * so the focused bone is framed with its neighbours still visible around it.
 */
export const BONE_FOCUS_PADDING = 2.6;

/**
 * Direction the camera sits in, relative to the framing target.
 *
 * A dorsolateral three-quarter view (+X lateral, +Y dorsal, +Z anterior): bones read with
 * depth rather than as flat silhouettes, and it matches the dorsoplantar orientation of
 * the X-ray beside it. Reused for both whole-model framing and single-bone focus so the
 * view angle stays stable and only the distance changes.
 */
export const DEFAULT_VIEW_DIRECTION: readonly [number, number, number] = [0.35, 0.55, 1];

/** Smallest radius we will frame, so a degenerate bounding box cannot divide by ~0. */
const MIN_FRAMING_RADIUS = 0.2;

/**
 * Cubic ease-out: fast departure, gentle settle.
 *
 * Used for the focus animation, where the camera should feel like it is arriving rather
 * than stopping. Input is clamped so a long frame cannot overshoot past the goal.
 */
export function easeOutCubic(t: number): number {
  const clamped = clamp(t, 0, 1);
  return 1 - (1 - clamped) ** 3;
}

/** An axis-aligned box described by its centre and full extents. */
export interface Bounds {
  center: readonly [number, number, number];
  size: readonly [number, number, number];
}

export interface FramingOptions {
  /** Vertical field of view in degrees. Defaults to {@link CAMERA_FOV}. */
  fov?: number;
  /** Viewport aspect ratio (width / height). Portrait viewports need more distance. */
  aspect?: number;
  /** Multiplier on the fitted radius. Defaults to {@link MODEL_FRAME_PADDING}. */
  padding?: number;
  /** Direction from target to camera. Defaults to {@link DEFAULT_VIEW_DIRECTION}. */
  direction?: readonly [number, number, number];
  minDistance?: number;
  maxDistance?: number;
}

export interface Framing {
  position: [number, number, number];
  target: [number, number, number];
  distance: number;
}

/**
 * Radius of the sphere that encloses a box of the given extents.
 *
 * Framing against the bounding *sphere* rather than the box makes the result independent
 * of the viewing direction: the camera distance is then correct from any angle, so a
 * later orbit can never reveal that the bone was only framed for one orientation.
 */
export function boundsRadius(size: readonly [number, number, number]): number {
  const [x, y, z] = size;
  return 0.5 * Math.hypot(x, y, z);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Computes the camera position and target that frame `bounds`.
 *
 * Distance follows from the field of view: half the viewport subtends `fov / 2`, so a
 * sphere of radius `r` fits at `r / tan(fov / 2)`. On a viewport narrower than it is tall
 * the horizontal half-angle is the tighter constraint (`tan(hFov/2) = aspect * tan(fov/2)`),
 * which is why the aspect ratio divides the distance when it drops below 1.
 *
 * @param bounds - Box to frame, in model units
 * @param options - Field of view, padding, view direction and distance clamps
 * @returns Camera position, orbit target, and the distance between them
 *
 * @example
 * computeFraming({ center: [0, 0, 0], size: [10, 6, 26] }, { padding: 1.2 });
 * // -> camera pulled back ~37 units along the dorsolateral view direction
 */
export function computeFraming(bounds: Bounds, options: FramingOptions = {}): Framing {
  const {
    fov = CAMERA_FOV,
    aspect,
    padding = MODEL_FRAME_PADDING,
    direction = DEFAULT_VIEW_DIRECTION,
    minDistance = CAMERA_MIN_DISTANCE,
    maxDistance = CAMERA_MAX_DISTANCE,
  } = options;

  const radius = Math.max(boundsRadius(bounds.size), MIN_FRAMING_RADIUS);
  const halfFov = (fov * Math.PI) / 360;

  let distance = (radius * padding) / Math.tan(halfFov);

  // Only a portrait viewport is more constrained horizontally than vertically.
  if (aspect !== undefined && aspect > 0 && aspect < 1) {
    distance /= aspect;
  }

  distance = clamp(distance, minDistance, maxDistance);

  const [dx, dy, dz] = direction;
  const length = Math.hypot(dx, dy, dz);
  // Fall back to a straight-on view rather than producing NaN for a zero direction.
  const unit: readonly [number, number, number] =
    length > 0 ? [dx / length, dy / length, dz / length] : [0, 0, 1];

  const [cx, cy, cz] = bounds.center;

  return {
    position: [cx + unit[0] * distance, cy + unit[1] * distance, cz + unit[2] * distance],
    target: [cx, cy, cz],
    distance,
  };
}
