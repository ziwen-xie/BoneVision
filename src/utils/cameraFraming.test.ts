/**
 * Unit tests for the camera framing math.
 *
 * Covers the two things that silently break the 3D viewer if they drift: framing
 * distances that fall outside the orbit clamps (the controls would yank the camera back
 * after an animation), and an easing curve that is not actually an ease-out.
 *
 * Requirements: 4.4, 4.5, 4.6
 */

import { describe, it, expect } from 'vitest';
import {
  BONE_FOCUS_PADDING,
  CAMERA_FOV,
  CAMERA_MAX_DISTANCE,
  CAMERA_MIN_DISTANCE,
  MODEL_FRAME_PADDING,
  boundsRadius,
  computeFraming,
  easeOutCubic,
  type Bounds,
} from './cameraFraming';

/** Measured extents of the procedural foot skeleton. */
const FOOT: Bounds = { center: [0, 0, 0], size: [9.63, 6.11, 26.45] };
/** The smallest bone in the model, which produces the tightest framing distance. */
const SESAMOIDS: Bounds = { center: [-3.6, -2.5, 7.4], size: [1.14, 0.49, 0.69] };

/** Half-angle tangent of the vertical field of view. */
const HALF_FOV_TAN = Math.tan((CAMERA_FOV * Math.PI) / 360);

describe('boundsRadius', () => {
  it('returns the radius of the sphere enclosing the box', () => {
    expect(boundsRadius([2, 0, 0])).toBe(1);
    expect(boundsRadius([2, 2, 2])).toBeCloseTo(Math.sqrt(3), 6);
  });
});

describe('computeFraming', () => {
  it('pulls back far enough for the bounds to fit the frustum', () => {
    const framing = computeFraming(FOOT, { padding: MODEL_FRAME_PADDING });

    expect(framing.distance).toBeGreaterThanOrEqual(boundsRadius(FOOT.size) / HALF_FOV_TAN);
  });

  it('targets the centre of the bounds', () => {
    const framing = computeFraming(SESAMOIDS, { padding: BONE_FOCUS_PADDING });

    expect(framing.target).toEqual([...SESAMOIDS.center]);
  });

  it('places the camera at the requested distance from the target', () => {
    const framing = computeFraming(SESAMOIDS, { padding: BONE_FOCUS_PADDING });
    const [px, py, pz] = framing.position;
    const [tx, ty, tz] = framing.target;

    expect(Math.hypot(px - tx, py - ty, pz - tz)).toBeCloseTo(framing.distance, 6);
  });

  it('keeps whole-model and single-bone distances inside the orbit clamps', () => {
    const whole = computeFraming(FOOT, { padding: MODEL_FRAME_PADDING });
    const bone = computeFraming(SESAMOIDS, { padding: BONE_FOCUS_PADDING });

    for (const distance of [whole.distance, bone.distance]) {
      expect(distance).toBeGreaterThanOrEqual(CAMERA_MIN_DISTANCE);
      expect(distance).toBeLessThanOrEqual(CAMERA_MAX_DISTANCE);
    }
  });

  it('pulls back further on a portrait viewport, where width is the tighter fit', () => {
    const portrait = computeFraming(FOOT, { aspect: 0.6 });
    const square = computeFraming(FOOT, { aspect: 1 });

    expect(portrait.distance).toBeGreaterThan(square.distance);
    expect(portrait.distance).toBeCloseTo(square.distance / 0.6, 4);
  });

  it('uses the vertical fit on a landscape viewport', () => {
    expect(computeFraming(FOOT, { aspect: 2 }).distance).toBe(
      computeFraming(FOOT, { aspect: 1 }).distance
    );
  });

  it('stays finite for degenerate bounds and a zero view direction', () => {
    const framing = computeFraming(
      { center: [1, 2, 3], size: [0, 0, 0] },
      { direction: [0, 0, 0] }
    );

    expect(framing.position.every(Number.isFinite)).toBe(true);
    expect(framing.distance).toBeGreaterThanOrEqual(CAMERA_MIN_DISTANCE);
  });
});

describe('easeOutCubic', () => {
  it('spans 0 to 1 and clamps beyond the interval', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(-5)).toBe(0);
    expect(easeOutCubic(5)).toBe(1);
  });

  it('front-loads the motion', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.8);
  });

  it('is monotonic and decelerating', () => {
    let previous = 0;
    let previousStep = Infinity;

    for (let i = 1; i <= 50; i++) {
      const value = easeOutCubic(i / 50);
      const step = value - previous;

      expect(value).toBeGreaterThanOrEqual(previous);
      expect(step).toBeLessThanOrEqual(previousStep + 1e-12);

      previous = value;
      previousStep = step;
    }
  });
});
