/**
 * Unit tests for emissive bone highlighting.
 *
 * These run against real `MeshStandardMaterial` instances (no WebGL context needed), so
 * they check what the 3D view actually ends up showing: which bone is lit, in which
 * colour, how strongly, and that everything returns to black when the pointer leaves.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.5, 5.6
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  HOVER_INTENSITY,
  SELECTED_INTENSITY,
  stepHighlights,
  targetIntensity,
  type HighlightTarget,
} from './boneHighlight';

const TALUS_COLOR = '#C77DFF';
const CALCANEUS_COLOR = '#2EC4B6';

/** A target whose material is known to exist, so the tests can read it directly. */
type MaterialTarget = HighlightTarget & { material: THREE.MeshStandardMaterial };

/**
 * Mirrors `createBoneMaterial` in the skeleton builder: black emissive at zero intensity,
 * so the highlight code owns both properties. (A default `MeshStandardMaterial` starts at
 * `emissiveIntensity: 1`, which emits nothing while the colour is black but would not
 * match the real bones.)
 */
function makeTarget(boneId: string, color: string): MaterialTarget {
  return {
    boneId,
    material: new THREE.MeshStandardMaterial({
      emissive: 0x000000,
      emissiveIntensity: 0,
    }),
    highlight: new THREE.Color(color),
    intensity: 0,
  };
}

/** Steps the fade for `ms` of wall-clock time at 60 FPS. */
function advance(
  targets: readonly HighlightTarget[],
  hovered: string | null,
  selected: string | null,
  ms: number
): void {
  const frames = Math.round(ms / (1000 / 60));

  for (let i = 0; i < frames; i++) {
    stepHighlights(targets, hovered, selected, 1 / 60);
  }
}

function emissiveHex(target: MaterialTarget): string {
  return `#${target.material.emissive.getHexString().toUpperCase()}`;
}

describe('targetIntensity', () => {
  it('prefers hover over selection, matching the educational panel', () => {
    expect(targetIntensity('talus', 'talus', 'calcaneus')).toBe(HOVER_INTENSITY);
    expect(targetIntensity('calcaneus', 'talus', 'calcaneus')).toBe(SELECTED_INTENSITY);
    expect(targetIntensity('talus', 'talus', 'talus')).toBe(HOVER_INTENSITY);
    expect(targetIntensity('cuboid', 'talus', 'calcaneus')).toBe(0);
  });

  it('reads hover stronger than selection', () => {
    expect(HOVER_INTENSITY).toBeGreaterThan(SELECTED_INTENSITY * 2);
  });
});

describe('stepHighlights', () => {
  let talus: MaterialTarget;
  let calcaneus: MaterialTarget;
  let targets: MaterialTarget[];

  beforeEach(() => {
    talus = makeTarget('talus', TALUS_COLOR);
    calcaneus = makeTarget('calcaneus', CALCANEUS_COLOR);
    targets = [talus, calcaneus];
  });

  it('lights the hovered bone to near full strength within 100ms', () => {
    advance(targets, 'talus', null, 100);

    expect(talus.material.emissiveIntensity).toBeGreaterThan(HOVER_INTENSITY * 0.9);
  });

  it("uses the bone's configured highlight colour", () => {
    advance(targets, 'talus', null, 100);

    expect(emissiveHex(talus)).toBe(TALUS_COLOR);
  });

  it('leaves every other bone unlit and untouched', () => {
    advance(targets, 'talus', null, 100);

    // Emission is emissive colour times intensity, so black is the decisive check.
    expect(calcaneus.material.emissive.getHex()).toBe(0x000000);
    expect(calcaneus.material.emissiveIntensity).toBe(0);
    expect(calcaneus.intensity).toBe(0);
  });

  it('settles a selected bone at the quieter selection intensity', () => {
    advance(targets, null, 'calcaneus', 200);

    expect(calcaneus.material.emissiveIntensity).toBeCloseTo(SELECTED_INTENSITY, 9);
    expect(emissiveHex(calcaneus)).toBe(CALCANEUS_COLOR);
  });

  it('returns to exactly black when hover and selection clear', () => {
    advance(targets, 'talus', 'calcaneus', 200);
    advance(targets, null, null, 200);

    for (const target of targets) {
      expect(target.intensity).toBe(0);
      expect(target.material.emissiveIntensity).toBe(0);
      expect(target.material.emissive.getHex()).toBe(0x000000);
    }
  });

  it('fades by wall-clock time rather than frame count', () => {
    const slow = makeTarget('talus', TALUS_COLOR);
    const fast = makeTarget('talus', TALUS_COLOR);

    for (let i = 0; i < 3; i++) {
      stepHighlights([slow], 'talus', null, 1 / 30);
    }

    for (let i = 0; i < 6; i++) {
      stepHighlights([fast], 'talus', null, 1 / 60);
    }

    expect(slow.intensity).toBeCloseTo(fast.intensity, 2);
  });

  it('eases rather than snapping', () => {
    stepHighlights(targets, 'talus', null, 1 / 60);

    expect(talus.intensity).toBeGreaterThan(0);
    expect(talus.intensity).toBeLessThan(HOVER_INTENSITY);
  });

  it('tolerates a missing material and an empty target list', () => {
    const noMaterial: HighlightTarget = {
      boneId: 'talus',
      material: null,
      highlight: new THREE.Color(TALUS_COLOR),
      intensity: 0,
    };

    expect(() => stepHighlights([noMaterial], 'talus', null, 1 / 60)).not.toThrow();
    expect(noMaterial.intensity).toBeGreaterThan(0);
    expect(() => stepHighlights([], 'talus', null, 1 / 60)).not.toThrow();
  });
});
