/**
 * ModelViewer
 *
 * The 3D half of the split view: a React Three Fiber canvas showing the foot skeleton,
 * with orbit controls, synchronized highlighting and camera framing.
 *
 * Failure handling is deliberate. WebGL is checked *before* the canvas mounts, and the
 * canvas is additionally wrapped in a local error boundary, so a machine without WebGL
 * (or a driver that fails on context creation) gets an explanatory panel here instead of
 * taking the whole application down with it - the X-ray viewer and educational panel keep
 * working (Requirements 3.6, 14.6).
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 10.6
 */

import { Component, Suspense, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import BoneModelGroup from './BoneModelGroup';
import CameraAnimator from './CameraAnimator';
import { useSkeletonMapStore } from '../stores';
import { ERROR_MESSAGES, type ModelViewerProps } from '../types';
import {
  CAMERA_FOV,
  CAMERA_INITIAL_POSITION,
  CAMERA_MAX_DISTANCE,
  CAMERA_MAX_POLAR_ANGLE,
  CAMERA_MIN_DISTANCE,
  CAMERA_MIN_POLAR_ANGLE,
} from '../utils/cameraFraming';

/** Matches the X-ray panel backdrop (`bg-xray-dark`) so the split view reads as one surface. */
const CLEAR_COLOR = '#0f1419';

// ---------------------------------------------------------------------------
// WebGL availability
// ---------------------------------------------------------------------------

/**
 * Probes for a usable WebGL context on a throwaway canvas.
 *
 * Checking up front costs one context and avoids mounting a canvas that can only fail.
 * Some browsers expose `WebGLRenderingContext` but still refuse to create a context
 * (blocklisted drivers, exhausted context limit), so the context itself is requested
 * rather than trusting feature detection alone.
 */
function detectWebGL(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  try {
    const probe = document.createElement('canvas');
    const context =
      probe.getContext('webgl2') ??
      probe.getContext('webgl') ??
      probe.getContext('experimental-webgl');

    return context !== null;
  } catch {
    return false;
  }
}

function UnsupportedNotice({ detail }: { detail?: string }) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3 bg-xray-dark p-6 text-center"
      role="alert"
    >
      <h2 className="text-base font-semibold text-neutral-100">
        3D view unavailable
      </h2>
      <p className="max-w-sm text-sm text-neutral-300">
        {ERROR_MESSAGES.WEBGL_NOT_SUPPORTED}
      </p>
      <p className="max-w-sm text-xs text-neutral-400">
        SkeletonMap needs WebGL, which is available in current versions of Chrome, Edge,
        Firefox and Safari. Hardware acceleration also has to be enabled in your browser
        settings. The X-ray view on the left still works without it.
      </p>
      {detail && <p className="max-w-sm text-xs text-neutral-500">{detail}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Canvas error boundary
// ---------------------------------------------------------------------------

interface CanvasBoundaryProps {
  children: ReactNode;
}

interface CanvasBoundaryState {
  message: string | null;
}

/**
 * Contains rendering failures from the WebGL canvas.
 *
 * Renderer construction throws synchronously during render, which React would otherwise
 * propagate to the root and blank the page. Scoped here, the rest of the app survives.
 */
class CanvasErrorBoundary extends Component<CanvasBoundaryProps, CanvasBoundaryState> {
  state: CanvasBoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): CanvasBoundaryState {
    return {
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown): void {
    console.error('[ModelViewer] 3D canvas failed to render', error);
  }

  render(): ReactNode {
    if (this.state.message !== null) {
      return <UnsupportedNotice detail={this.state.message} />;
    }

    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

/**
 * Placeholder shown while the scene suspends.
 *
 * A Suspense fallback lives inside the canvas, so it has to be drawable rather than DOM:
 * a slowly turning wireframe sphere at roughly the model's scale reads as "something is
 * coming" without implying any particular anatomy.
 */
function SceneFallback() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.6;
    }
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[6, 1]} />
        <meshBasicMaterial color="#4da6ff" wireframe transparent opacity={0.3} />
      </mesh>
    </>
  );
}

/**
 * Lighting, controls and model.
 *
 * Lighting is a three-part setup: ambient to keep the plantar surfaces from going black,
 * a bright key light from the front-upper-right, and a weaker fill from behind-below to
 * separate overlapping bones. Flat ambient-only lighting would collapse the tarsals into
 * one shape (Requirement 3.3).
 */
function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[12, 16, 10]} intensity={1.1} />
      <directionalLight position={[-14, -8, -10]} intensity={0.35} />

      <OrbitControls
        // Publishes the controls on the R3F state so CameraAnimator can drive the
        // orbit target rather than only the camera position.
        makeDefault
        enablePan
        enableZoom
        enableRotate
        enableDamping
        dampingFactor={0.08}
        minDistance={CAMERA_MIN_DISTANCE}
        maxDistance={CAMERA_MAX_DISTANCE}
        minPolarAngle={CAMERA_MIN_POLAR_ANGLE}
        maxPolarAngle={CAMERA_MAX_POLAR_ANGLE}
        // Requirement 4.7: one finger orbits, two fingers pinch-zoom and pan.
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
      />

      <BoneModelGroup />
      <CameraAnimator />
    </>
  );
}

// ---------------------------------------------------------------------------
// ModelViewer
// ---------------------------------------------------------------------------

export default function ModelViewer({ className = '' }: ModelViewerProps) {
  // Probed once per mount; the answer cannot change while the tab is open.
  const [webglSupported] = useState(detectWebGL);

  const mappingConfig = useSkeletonMapStore((state) => state.mappingConfig);
  const isLoadingModel = useSkeletonMapStore((state) => state.isLoadingModel);
  const setHoveredBone = useSkeletonMapStore((state) => state.setHoveredBone);

  if (!webglSupported) {
    return <UnsupportedNotice />;
  }

  // Bones are only interactive once the mapping configuration has arrived, since the
  // mesh-to-bone join lives there.
  const isPreparing = isLoadingModel || mappingConfig === null;

  return (
    <div
      className={`relative h-full w-full bg-xray-dark ${className}`}
      // Requirement 5.6: highlights clear when the pointer leaves this view, including
      // when it exits the canvas quickly enough to outrun the per-mesh pointer-out.
      onPointerLeave={() => setHoveredBone(null)}
    >
      <CanvasErrorBoundary>
        <Canvas
          camera={{
            position: [...CAMERA_INITIAL_POSITION],
            fov: CAMERA_FOV,
            near: 0.1,
            far: 500,
          }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          // Capped so high-density displays do not quadruple the fragment cost and drop
          // below the 30 FPS target (Requirement 3.4).
          dpr={[1, 2]}
          onCreated={({ gl }) => gl.setClearColor(CLEAR_COLOR)}
          style={{ touchAction: 'none' }}
        >
          <Suspense fallback={<SceneFallback />}>
            <SceneContent />
          </Suspense>
        </Canvas>
      </CanvasErrorBoundary>

      {isPreparing && (
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-xray-dark/70"
          role="status"
          aria-live="polite"
        >
          <span
            className="h-10 w-10 animate-spin rounded-full border-2 border-primary-200/30 border-t-primary-300"
            aria-hidden="true"
          />
          <p className="text-sm text-neutral-200">Preparing 3D bone model…</p>
        </div>
      )}
    </div>
  );
}
