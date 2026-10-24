/**
 * CameraAnimator
 *
 * The only component that writes to the live camera. It watches the camera goal held in
 * the store (`cameraPosition` / `cameraTarget` / `isAnimatingCamera`) and either eases the
 * camera there over 500ms or snaps it, then hands control back to `OrbitControls`.
 *
 * Why the orbit target is driven too
 * ----------------------------------
 * Moving `camera.position` alone looks right for exactly one frame. `OrbitControls`
 * derives its orbit from the vector between the camera and *its own* `target`, so on the
 * user's next drag the view would swing back around the stale target. Both are therefore
 * animated together, and `controls.update()` is called so the controls re-derive their
 * internal spherical state from the position we just wrote.
 *
 * The controls are obtained from `useThree(state => state.controls)`, which is populated
 * because `SceneContent` renders `<OrbitControls makeDefault />`. That avoids threading a
 * ref through the scene graph, and it degrades gracefully: if the controls are not ready
 * yet the camera simply looks at the target, and the effect re-runs once they appear.
 *
 * Interaction with user navigation: the goal is applied only while `isAnimatingCamera` is
 * true, or once when the goal changes. Nothing is written on an idle frame, so orbiting,
 * panning and zooming are never fought by this component.
 *
 * Requirements: 2.6, 4.5, 4.6
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useBoneVisionStore } from '../stores';
import { ANIMATION_DURATIONS } from '../types';
import { easeOutCubic } from '../utils/cameraFraming';

/**
 * The slice of `OrbitControls` this component needs.
 *
 * R3F types `state.controls` loosely (any object may be made default), so rather than
 * importing the concrete controls class the shape is narrowed structurally at runtime.
 */
interface OrbitTargetControls {
  target: THREE.Vector3;
  update: () => void;
}

function asOrbitControls(value: unknown): OrbitTargetControls | null {
  if (value === null || typeof value !== 'object') {
    return null;
  }

  const candidate = value as { target?: unknown; update?: unknown };

  return candidate.target instanceof THREE.Vector3 && typeof candidate.update === 'function'
    ? (value as OrbitTargetControls)
    : null;
}

export default function CameraAnimator() {
  const camera = useThree((state) => state.camera);
  const rawControls = useThree((state) => state.controls);

  const cameraPosition = useBoneVisionStore((state) => state.cameraPosition);
  const cameraTarget = useBoneVisionStore((state) => state.cameraTarget);
  const isAnimatingCamera = useBoneVisionStore((state) => state.isAnimatingCamera);

  const controls = asOrbitControls(rawControls);

  // Vectors are memoized on the store tuples, so a new goal (a new array from `set`)
  // produces new vectors and nothing else does.
  const goalPosition = useMemo(() => new THREE.Vector3(...cameraPosition), [cameraPosition]);
  const goalTarget = useMemo(() => new THREE.Vector3(...cameraTarget), [cameraTarget]);

  /** Where the camera was when the current animation started. */
  const startPosition = useRef(new THREE.Vector3());
  const startTarget = useRef(new THREE.Vector3());
  /** Milliseconds elapsed in the current animation. */
  const elapsed = useRef(0);

  useEffect(() => {
    if (isAnimatingCamera) {
      // Capture the departure point once. Interpolating from a captured start (rather
      // than lerping the live position toward the goal every frame) is what makes the
      // easing curve actually cubic instead of exponential.
      startPosition.current.copy(camera.position);
      startTarget.current.copy(controls ? controls.target : goalTarget);
      elapsed.current = 0;
      return;
    }

    // Not animating: apply the goal exactly once. This is the path auto-framing takes on
    // load, where the framed view should be in place for the first paint. It also runs
    // harmlessly at the end of an animation (the camera is already there) and re-runs if
    // the controls mount after the first pass.
    camera.position.copy(goalPosition);

    if (controls) {
      controls.target.copy(goalTarget);
      controls.update();
    } else {
      camera.lookAt(goalTarget);
    }
  }, [camera, controls, goalPosition, goalTarget, isAnimatingCamera]);

  useFrame((_, delta) => {
    if (!isAnimatingCamera) {
      return;
    }

    elapsed.current += delta * 1000;

    const progress = Math.min(elapsed.current / ANIMATION_DURATIONS.CAMERA_FOCUS, 1);
    const eased = easeOutCubic(progress);

    camera.position.lerpVectors(startPosition.current, goalPosition, eased);

    if (controls) {
      controls.target.lerpVectors(startTarget.current, goalTarget, eased);
      controls.update();
    } else {
      camera.lookAt(goalTarget);
    }

    if (progress >= 1) {
      // Releases the camera back to OrbitControls.
      useBoneVisionStore.setState({ isAnimatingCamera: false });
    }
  });

  return null;
}
