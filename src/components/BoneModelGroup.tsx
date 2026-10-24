/**
 * BoneModelGroup
 *
 * Renders the procedural foot skeleton as 19 individually interactive meshes, keeps their
 * emissive highlight in sync with the store, and publishes their bounding boxes so the
 * camera can frame them.
 *
 * Mesh identity
 * -------------
 * `buildFootSkeleton` names its meshes with the `meshId` values from the mapping
 * configuration, but every other part of the app speaks in bone `id`s (`calcaneus`,
 * `metatarsal-1`, ...). The two are joined once here, so hover and selection can flow
 * straight through the store in bone-`id` terms.
 *
 * Why highlighting runs in `useFrame` and not in an effect
 * -------------------------------------------------------
 * Hover state changes constantly as the pointer sweeps across bones. Subscribing to
 * `hoveredBoneId` with a hook would re-render this component - and reconcile 19
 * `<primitive>` elements - on every boundary crossing. Instead the frame loop reads the
 * current ids from the store and mutates material properties directly: no React render,
 * no geometry or material ever rebuilt, which is what keeps the viewer at frame rate
 * while the pointer moves (Requirement 3.4). The frame loop also lets the intensity ease
 * in rather than snap, and it still lands well inside the 100ms highlight budget.
 *
 * Requirements: 3.1, 3.2, 3.4, 3.5, 5.1, 5.2, 5.3, 5.5, 5.6, 2.6, 4.5
 */

import { useEffect, useMemo, useRef } from 'react';
import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { buildFootSkeleton, getBoneMeshes } from '../models/footSkeleton';
import {
  clearBoneBounds,
  registerBoneBounds,
  setViewportAspect,
} from '../models/boneBoundsRegistry';
import { useSkeletonMapStore } from '../stores';
import type { Bounds } from '../utils/cameraFraming';
import { type HighlightTarget, stepHighlights } from '../utils/boneHighlight';

/** A highlightable bone plus the mesh the pointer events attach to. */
interface BoneEntry extends HighlightTarget {
  mesh: THREE.Mesh;
}

function standardMaterialOf(mesh: THREE.Mesh): THREE.MeshStandardMaterial | null {
  const { material } = mesh;

  if (Array.isArray(material)) {
    const first = material[0];
    return first instanceof THREE.MeshStandardMaterial ? first : null;
  }

  return material instanceof THREE.MeshStandardMaterial ? material : null;
}

function boundsOf(box: THREE.Box3, center: THREE.Vector3, size: THREE.Vector3): Bounds {
  box.getCenter(center);
  box.getSize(size);

  return {
    center: [center.x, center.y, center.z],
    size: [size.x, size.y, size.z],
  };
}

/** Releases the GPU resources owned by a skeleton group. */
function disposeSkeleton(group: THREE.Group): void {
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.geometry.dispose();

    const { material } = child;
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
    } else {
      material.dispose();
    }
  });
}

export default function BoneModelGroup() {
  const mappingConfig = useSkeletonMapStore((state) => state.mappingConfig);
  const setHoveredBone = useSkeletonMapStore((state) => state.setHoveredBone);
  const setSelectedBone = useSkeletonMapStore((state) => state.setSelectedBone);
  const focusBone = useSkeletonMapStore((state) => state.focusBone);
  const frameModel = useSkeletonMapStore((state) => state.frameModel);

  const gl = useThree((state) => state.gl);
  const viewportWidth = useThree((state) => state.size.width);
  const viewportHeight = useThree((state) => state.size.height);

  // Built once for the life of the component. Rebuilding would recreate every geometry
  // and material on the GPU, so this must never depend on interaction state.
  const skeleton = useMemo(() => buildFootSkeleton(), []);

  const entries = useMemo<BoneEntry[]>(() => {
    if (!mappingConfig) {
      return [];
    }

    const meshes = getBoneMeshes(skeleton);

    return mappingConfig.bones.flatMap((bone) => {
      const mesh = meshes.get(bone.meshId);

      if (!mesh) {
        // A mapping entry pointing at a mesh that does not exist would otherwise show up
        // as a bone that silently never highlights.
        console.warn(
          `[BoneModelGroup] No mesh named "${bone.meshId}" for bone "${bone.id}"; it will not be interactive.`
        );
        return [];
      }

      return [
        {
          boneId: bone.id,
          mesh,
          material: standardMaterialOf(mesh),
          highlight: new THREE.Color(bone.highlightColor),
          intensity: 0,
        },
      ];
    });
  }, [skeleton, mappingConfig]);

  // --------------------------------------------------------------------------
  // Viewport aspect (declared first so framing below sees a current value)
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (viewportHeight > 0) {
      setViewportAspect(viewportWidth / viewportHeight);
    }
  }, [viewportWidth, viewportHeight]);

  // --------------------------------------------------------------------------
  // Publish geometry and frame the model (Tasks 17.2, 18.1, 18.2)
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (entries.length === 0) {
      return;
    }

    const bounds = new Map<string, Bounds>();
    const combined = new THREE.Box3();
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();

    for (const entry of entries) {
      const { geometry } = entry.mesh;

      if (!geometry.boundingBox) {
        geometry.computeBoundingBox();
      }

      const box = geometry.boundingBox;

      if (!box) {
        continue;
      }

      // Valid as world-space boxes: the builder bakes each mesh's transform into its
      // geometry and leaves the group matrix as identity.
      combined.union(box);
      bounds.set(entry.boneId, boundsOf(box, center, size));
    }

    registerBoneBounds(
      bounds,
      combined.isEmpty() ? null : boundsOf(combined, center, size)
    );

    // Requirement 4.5: the whole foot is framed as soon as it is measurable.
    frameModel();

    return () => clearBoneBounds();
  }, [entries, frameModel]);

  // --------------------------------------------------------------------------
  // GPU cleanup (Task 16.3)
  // --------------------------------------------------------------------------

  /** Pending disposal, deferred so a remount can cancel it. */
  const disposeHandle = useRef<number | null>(null);

  useEffect(() => {
    // A remount arrived before the pending disposal ran: keep the resources.
    if (disposeHandle.current !== null) {
      clearTimeout(disposeHandle.current);
      disposeHandle.current = null;
    }

    const current = skeleton;

    return () => {
      // Disposal is deferred by a tick because StrictMode unmounts and immediately
      // remounts with the same memoized group; disposing synchronously would leave the
      // remounted viewer holding freed buffers. On a real unmount nothing cancels the
      // timer and the resources are released.
      disposeHandle.current = window.setTimeout(() => {
        disposeHandle.current = null;
        disposeSkeleton(current);
      }, 0);
    };
  }, [skeleton]);

  // Leave the shared canvas cursor as we found it.
  useEffect(() => {
    const canvas = gl.domElement;

    return () => {
      canvas.style.cursor = '';
    };
  }, [gl]);

  // --------------------------------------------------------------------------
  // Highlighting (Tasks 16.4, 22.1, 22.2, 22.3)
  // --------------------------------------------------------------------------

  useFrame((_, delta) => {
    // Read rather than subscribe: see the note at the top of this file. This is the
    // receiving end of both highlight directions - the X-ray overlay and the pointer
    // handlers below write the same two store fields.
    const { hoveredBoneId, selectedBoneId } = useSkeletonMapStore.getState();

    stepHighlights(entries, hoveredBoneId, selectedBoneId, delta);
  });

  return (
    <group name="FootSkeletonRoot">
      {entries.map((entry) => (
        <primitive
          key={entry.boneId}
          object={entry.mesh}
          onPointerOver={(event: ThreeEvent<PointerEvent>) => {
            // The raycaster reports every bone along the ray, back to front. Without
            // this the deepest hit would win and the wrong bone would highlight.
            event.stopPropagation();
            gl.domElement.style.cursor = 'pointer';
            setHoveredBone(entry.boneId);
          }}
          onPointerOut={(event: ThreeEvent<PointerEvent>) => {
            event.stopPropagation();

            // Leaving one bone for an adjacent one can fire this *after* the neighbour's
            // `onPointerOver`, so clear the hover (and the cursor) only if it is still
            // ours - otherwise moving along the foot would blank the new highlight.
            if (useSkeletonMapStore.getState().hoveredBoneId === entry.boneId) {
              setHoveredBone(null);
              gl.domElement.style.cursor = '';
            }
          }}
          onClick={(event: ThreeEvent<MouseEvent>) => {
            event.stopPropagation();
            setSelectedBone(entry.boneId);
            focusBone(entry.boneId);
          }}
        />
      ))}
    </group>
  );
}
