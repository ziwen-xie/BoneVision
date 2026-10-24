/**
 * Procedural foot skeleton model.
 *
 * Builds an anatomically-arranged right foot skeleton entirely in code, so that every
 * bone is a separately addressable `THREE.Mesh` whose `.name` matches a `meshId` in
 * `public/config/foot-mapping.json`. Generating the geometry (rather than loading a GLB)
 * guarantees the 19 named highlight targets exist and keeps the asset original work.
 *
 * Coordinate system (right foot, dorsoplantar view):
 * - `+Z` = anterior (toes), `-Z` = posterior (heel)
 * - `-X` = medial (great toe / 1st metatarsal), `+X` = lateral (5th toe)
 * - `+Y` = dorsal (up); the midfoot tarsals sit higher than the heel and the
 *   metatarsal heads, producing the medial longitudinal arch.
 *
 * Scale is arbitrary "units": the foot is roughly 26 long, 10 wide, 6 tall. The returned
 * group is recentred on its bounding-box centre so camera auto-framing is predictable.
 *
 * Requirements: 3.1, 3.5, 11.1, 11.2, 11.3, 11.6
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * The complete set of bone mesh names this model produces.
 *
 * These names are contractual: the `meshId` values in the mapping configuration are
 * resolved against them at runtime, so renaming one here silently breaks a hover target.
 * `verifyFootSkeleton` exists to make such a mistake fail loudly instead.
 */
export const FOOT_BONE_MESH_NAMES = [
  // Hindfoot
  'Calcaneus',
  'Talus',
  // Midfoot
  'Navicular',
  'Cuboid',
  'Medial_Cuneiform',
  'Intermediate_Cuneiform',
  'Lateral_Cuneiform',
  // Forefoot - metatarsals
  'Metatarsal_1',
  'Metatarsal_2',
  'Metatarsal_3',
  'Metatarsal_4',
  'Metatarsal_5',
  'Sesamoid_Bones',
  // Forefoot - phalanges
  'Proximal_Phalanx_1',
  'Distal_Phalanx_1',
  'Toe_2_Phalanges',
  'Toe_3_Phalanges',
  'Toe_4_Phalanges',
  'Toe_5_Phalanges',
] as const;

/** A bone mesh name produced by {@link buildFootSkeleton}. */
export type FootBoneMeshName = (typeof FOOT_BONE_MESH_NAMES)[number];

/** Base colour shared by every bone material (each mesh still owns its own instance). */
const BONE_COLOR = 0xece5d8;
const BONE_ROUGHNESS = 0.6;

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

type Vec3 = readonly [number, number, number];

/**
 * Small deterministic PRNG (mulberry32). Used so the irregular tarsal shapes are
 * identical on every run and across machines - a model that changes shape between
 * reloads would make the X-ray region mapping unreliable.
 */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds an irregular, blob-like geometry for the tarsal bones.
 *
 * Starts from an icosahedron (uniform triangle density, no poles) and displaces each
 * vertex radially by a sum of low-frequency sinusoids. The displacement is a pure
 * function of the vertex *position*, not its index, which matters because
 * `IcosahedronGeometry` is non-indexed: index-based noise would tear the surface apart
 * at shared vertices.
 *
 * @param seed - Seed for the lobe frequencies/phases, giving each bone its own shape
 * @param detail - Icosahedron subdivision level; yields 20 * (detail + 1)^2 triangles
 *                 (4 = 500, 5 = 720)
 * @param scale - Non-uniform scale applied after displacement, in model units
 * @param amount - Displacement magnitude as a fraction of the unit radius
 */
function createIrregularBone(
  seed: number,
  detail: number,
  scale: Vec3,
  amount: number
): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, detail);
  const random = createRandom(seed);

  // Three independent sinusoidal lobes produce a lumpy but smooth surface.
  const lobes = [0, 1, 2].map(() => ({
    fx: 1.1 + random() * 1.8,
    fy: 1.1 + random() * 1.8,
    fz: 1.1 + random() * 1.8,
    phase: random() * Math.PI * 2,
    weight: 0.4 + random() * 0.6,
  }));

  const position = geometry.getAttribute('position');
  const vertex = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);

    let noise = 0;
    let weightSum = 0;
    for (const lobe of lobes) {
      noise +=
        lobe.weight *
        Math.sin(lobe.fx * vertex.x + lobe.fy * vertex.y + lobe.fz * vertex.z + lobe.phase);
      weightSum += lobe.weight;
    }
    noise /= weightSum;

    vertex.multiplyScalar(1 + amount * noise);
    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  geometry.scale(scale[0], scale[1], scale[2]);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Radius profile of a long bone along its length.
 *
 * Models a diaphysis (narrow shaft) with a bulged epiphysis at each end, which is what
 * makes the result read as a bone rather than a capsule. `t` runs 0 (proximal base) to
 * 1 (distal head); the two Gaussian lobes add the end bulges on top of the shaft radius.
 */
function longBoneRadius(t: number, base: number, shaft: number, head: number): number {
  const proximalBulge = Math.exp(-(((t - 0.08) / 0.17) ** 2));
  const distalBulge = Math.exp(-(((t - 0.92) / 0.14) ** 2));
  const radius = shaft + (base - shaft) * proximalBulge + (head - shaft) * distalBulge;

  // Round the extreme ends off so the lathe closes without a flat disc.
  const capZone = 0.07;
  const edge = Math.min(t, 1 - t);
  const cap = edge >= capZone ? 1 : Math.sqrt(Math.max(edge, 0) / capZone);

  return Math.max(radius * cap, 1e-4);
}

interface LongBoneOptions {
  /** Proximal end (base) of the bone, in model space. */
  from: Vec3;
  /** Distal end (head) of the bone, in model space. */
  to: Vec3;
  /** Radius of the narrow mid-shaft. */
  shaft: number;
  /** Radius of the proximal bulge. */
  base: number;
  /** Radius of the distal bulge. */
  head: number;
  /** Lathe profile resolution along the length. */
  steps?: number;
  /** Lathe revolution segments around the axis. */
  segments?: number;
}

/**
 * Builds a long bone (metatarsal or phalanx) spanning `from` to `to`.
 *
 * The lathe is generated along +Y and then rotated/translated into place, with the
 * transform baked into the geometry. Baking keeps every mesh at the group origin, so a
 * mesh's `geometry.boundingBox` is directly usable for camera framing and label anchoring.
 */
function createLongBone(options: LongBoneOptions): THREE.BufferGeometry {
  const { from, to, shaft, base, head, steps = 24, segments = 20 } = options;

  const start = new THREE.Vector3(from[0], from[1], from[2]);
  const end = new THREE.Vector3(to[0], to[1], to[2]);
  const axis = new THREE.Vector3().subVectors(end, start);
  const length = axis.length();

  const profile: THREE.Vector2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    profile.push(new THREE.Vector2(longBoneRadius(t, base, shaft, head), (t - 0.5) * length));
  }

  const geometry = new THREE.LatheGeometry(profile, segments);

  const orientation = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    axis.clone().normalize()
  );
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  geometry.applyMatrix4(
    new THREE.Matrix4().compose(midpoint, orientation, new THREE.Vector3(1, 1, 1))
  );
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Builds the three phalanges of a lesser toe as one merged geometry.
 *
 * Toes 2-5 are highlighted as a unit per toe, so their proximal/middle/distal bones share
 * a single mesh. The toe vector is divided into three shrinking segments separated by
 * joint gaps, mirroring the real proportions.
 */
function createToePhalanges(from: Vec3, to: Vec3, scale: number): THREE.BufferGeometry {
  const start = new THREE.Vector3(from[0], from[1], from[2]);
  const end = new THREE.Vector3(to[0], to[1], to[2]);
  const direction = new THREE.Vector3().subVectors(end, start);

  // Proximal is the longest phalanx, distal the shortest; 0.03 of the length per joint gap.
  const segmentLengths = [0.44, 0.28, 0.22];
  const shaftRadii = [0.26, 0.225, 0.2];
  const gap = 0.03;

  const parts: THREE.BufferGeometry[] = [];
  let cursor = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const fraction = segmentLengths[i] ?? 0;
    const shaft = (shaftRadii[i] ?? 0.2) * scale;
    const segmentStart = new THREE.Vector3().copy(direction).multiplyScalar(cursor).add(start);
    const segmentEnd = new THREE.Vector3()
      .copy(direction)
      .multiplyScalar(cursor + fraction)
      .add(start);

    parts.push(
      createLongBone({
        from: [segmentStart.x, segmentStart.y, segmentStart.z],
        to: [segmentEnd.x, segmentEnd.y, segmentEnd.z],
        shaft,
        base: shaft * 1.55,
        head: shaft * 1.35,
        steps: 17,
        segments: 16,
      })
    );

    cursor += fraction + gap;
  }

  return mergeGeometries(parts) ?? parts[0] ?? new THREE.BufferGeometry();
}

/**
 * Builds the two sesamoid bones as a single merged geometry.
 *
 * They are small, paired and always discussed together, so they form one highlight
 * target sitting just plantar to the 1st metatarsal head.
 */
function createSesamoids(center: Vec3, separation: number, radius: number): THREE.BufferGeometry {
  const parts = [-0.5, 0.5].map((side) => {
    const sphere = new THREE.SphereGeometry(radius, 12, 8);
    sphere.scale(1, 0.82, 1.15);
    sphere.translate(center[0] + side * separation, center[1], center[2]);
    return sphere;
  });

  return mergeGeometries(parts) ?? new THREE.BufferGeometry();
}

/**
 * Creates a fresh bone material.
 *
 * Every mesh gets its own instance: highlighting works by writing `emissive` on a single
 * bone's material, and a shared material would tint every bone at once. `emissive` starts
 * black with zero intensity so the highlight code owns those two properties entirely.
 */
function createBoneMaterial(name: string): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: BONE_COLOR,
    roughness: BONE_ROUGHNESS,
    metalness: 0,
  });
  material.name = `${name}_Material`;
  material.emissive = new THREE.Color(0x000000);
  material.emissiveIntensity = 0;
  return material;
}

// ---------------------------------------------------------------------------
// Anatomical layout
// ---------------------------------------------------------------------------

interface IrregularBoneSpec {
  name: FootBoneMeshName;
  center: Vec3;
  scale: Vec3;
  detail: number;
  noise: number;
  seed: number;
}

/** Tarsals: irregular, roughly blocky bones of the hindfoot and midfoot. */
const TARSAL_BONES: readonly IrregularBoneSpec[] = [
  // Hindfoot, rear ~8 units. The calcaneus is the largest bone of the foot.
  {
    name: 'Calcaneus',
    center: [0.3, 1.9, -9.5],
    scale: [2.1, 2.2, 3.6],
    detail: 5,
    noise: 0.12,
    seed: 1001,
  },
  // Talus sits dorsal and anterior to the calcaneus, carrying the leg's load.
  {
    name: 'Talus',
    center: [-0.2, 3.9, -5.3],
    scale: [1.9, 1.7, 2.3],
    detail: 5,
    noise: 0.1,
    seed: 1002,
  },
  // Midfoot, next ~5 units. Navicular is flattened front-to-back, medial column.
  {
    name: 'Navicular',
    center: [-1.4, 3.5, -2.4],
    scale: [1.5, 1.3, 0.75],
    detail: 4,
    noise: 0.13,
    seed: 1003,
  },
  // Cuboid holds the lateral column, lower than the medial arch.
  {
    name: 'Cuboid',
    center: [2.4, 2.4, -1.6],
    scale: [1.2, 1.1, 1.35],
    detail: 4,
    noise: 0.12,
    seed: 1004,
  },
  // Three wedge-shaped cuneiforms, medial being the largest.
  {
    name: 'Medial_Cuneiform',
    center: [-2.0, 3.1, -0.4],
    scale: [1.0, 1.3, 1.2],
    detail: 4,
    noise: 0.11,
    seed: 1005,
  },
  {
    name: 'Intermediate_Cuneiform',
    center: [-0.5, 3.35, -0.7],
    scale: [0.75, 1.1, 0.9],
    detail: 4,
    noise: 0.11,
    seed: 1006,
  },
  {
    name: 'Lateral_Cuneiform',
    center: [0.85, 3.15, -0.6],
    scale: [0.9, 1.15, 1.05],
    detail: 4,
    noise: 0.11,
    seed: 1007,
  },
];

interface LongBoneSpec extends LongBoneOptions {
  name: FootBoneMeshName;
}

/**
 * Metatarsals and great-toe phalanges, ~9 and ~4 units of the foot's length.
 *
 * The five metatarsals fan outward from the midfoot: the 1st is the thickest and
 * shortest, the 2nd the longest. Heads drop in Y relative to the tarsal bases, which is
 * what forms the arch.
 */
const LONG_BONES: readonly LongBoneSpec[] = [
  {
    name: 'Metatarsal_1',
    from: [-2.2, 2.8, 0.9],
    to: [-3.6, 1.3, 7.6],
    shaft: 0.52,
    base: 0.8,
    head: 0.82,
  },
  {
    name: 'Metatarsal_2',
    from: [-0.6, 3.1, 0.4],
    to: [-1.7, 1.25, 9.2],
    shaft: 0.34,
    base: 0.58,
    head: 0.52,
  },
  {
    name: 'Metatarsal_3',
    from: [0.85, 2.95, 0.5],
    to: [0.1, 1.2, 8.8],
    shaft: 0.33,
    base: 0.56,
    head: 0.5,
  },
  {
    name: 'Metatarsal_4',
    from: [2.0, 2.6, 0.2],
    to: [1.9, 1.2, 8.3],
    shaft: 0.31,
    base: 0.54,
    head: 0.48,
  },
  {
    // The 5th metatarsal base carries the prominent styloid tuberosity.
    name: 'Metatarsal_5',
    from: [3.1, 2.4, -0.5],
    to: [4.0, 1.25, 7.3],
    shaft: 0.33,
    base: 0.78,
    head: 0.48,
  },
  {
    // The great toe has only two phalanges, both individually addressable.
    name: 'Proximal_Phalanx_1',
    from: [-3.7, 1.3, 7.9],
    to: [-4.0, 1.15, 11.0],
    shaft: 0.42,
    base: 0.62,
    head: 0.56,
  },
  {
    name: 'Distal_Phalanx_1',
    from: [-4.05, 1.15, 11.3],
    to: [-4.2, 1.1, 13.0],
    shaft: 0.36,
    base: 0.52,
    head: 0.46,
  },
];

interface ToeSpec {
  name: FootBoneMeshName;
  from: Vec3;
  to: Vec3;
  scale: number;
}

/** Lesser toes, each a row of three phalanges merged into one mesh. */
const TOE_BONES: readonly ToeSpec[] = [
  { name: 'Toe_2_Phalanges', from: [-1.8, 1.2, 9.5], to: [-2.2, 1.0, 12.7], scale: 1.0 },
  { name: 'Toe_3_Phalanges', from: [0.1, 1.15, 9.1], to: [0.0, 0.95, 12.0], scale: 0.95 },
  { name: 'Toe_4_Phalanges', from: [1.95, 1.15, 8.6], to: [2.4, 0.95, 11.2], scale: 0.88 },
  { name: 'Toe_5_Phalanges', from: [4.05, 1.2, 7.6], to: [4.8, 1.0, 9.9], scale: 0.8 },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds the complete procedural foot skeleton.
 *
 * Returns a group of 19 meshes, one per highlightable bone, each with its own material
 * and its world transform baked into its geometry. The group is recentred on its
 * bounding-box centre.
 *
 * @returns A `THREE.Group` named `FootSkeleton` containing all 19 bone meshes
 *
 * @example
 * const skeleton = buildFootSkeleton();
 * scene.add(skeleton);
 * getBoneMeshes(skeleton).get('Calcaneus'); // the heel bone mesh
 */
export function buildFootSkeleton(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'FootSkeleton';

  const addMesh = (name: FootBoneMeshName, geometry: THREE.BufferGeometry): void => {
    const mesh = new THREE.Mesh(geometry, createBoneMaterial(name));
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  for (const spec of TARSAL_BONES) {
    const geometry = createIrregularBone(spec.seed, spec.detail, spec.scale, spec.noise);
    geometry.translate(spec.center[0], spec.center[1], spec.center[2]);
    addMesh(spec.name, geometry);
  }

  for (const spec of LONG_BONES) {
    addMesh(spec.name, createLongBone(spec));
  }

  for (const spec of TOE_BONES) {
    addMesh(spec.name, createToePhalanges(spec.from, spec.to, spec.scale));
  }

  // Paired sesamoids sit just plantar (-Y) to the 1st metatarsal head.
  addMesh('Sesamoid_Bones', createSesamoids([-3.6, 0.5, 7.4], 0.42, 0.3));

  centerGroup(group);

  if (import.meta.env.DEV) {
    const check = verifyFootSkeleton(group);
    if (!check.valid) {
      console.error(
        '[footSkeleton] Bone mesh names do not match the expected set.',
        '\n  missing:',
        check.missing,
        '\n  unexpected:',
        check.unexpected
      );
    }
  }

  return group;
}

/**
 * Shifts every bone geometry so the group's bounding-box centre lands on the origin.
 *
 * Done by translating the geometries rather than the group transform, so the group keeps
 * an identity matrix and per-bone bounding boxes stay meaningful in model space.
 */
function centerGroup(group: THREE.Group): void {
  const bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.translate(-center.x, -center.y, -center.z);
      child.geometry.computeBoundingBox();
      child.geometry.computeBoundingSphere();
    }
  });
}

/**
 * Collects the bone meshes of a skeleton group, keyed by mesh name.
 *
 * @param group - A group produced by {@link buildFootSkeleton} (or a loaded scene)
 * @returns Map of mesh name to mesh
 *
 * @example
 * const meshes = getBoneMeshes(skeleton);
 * const material = meshes.get('Talus')?.material as THREE.MeshStandardMaterial;
 */
export function getBoneMeshes(group: THREE.Group): Map<string, THREE.Mesh> {
  const meshes = new Map<string, THREE.Mesh>();

  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.name) {
      meshes.set(child.name, child);
    }
  });

  return meshes;
}

/**
 * Checks that a skeleton group contains exactly the 19 expected bone meshes.
 *
 * A mesh-name typo would otherwise fail silently as a bone that simply never highlights,
 * so this is called on every build in development.
 *
 * @param group - The group to inspect
 * @returns Whether the name set matches, plus the differences either way
 */
export function verifyFootSkeleton(group: THREE.Group): {
  valid: boolean;
  missing: string[];
  unexpected: string[];
} {
  const found = new Set(getBoneMeshes(group).keys());
  const expected = new Set<string>(FOOT_BONE_MESH_NAMES);

  const missing = [...expected].filter((name) => !found.has(name));
  const unexpected = [...found].filter((name) => !expected.has(name));

  return {
    valid: missing.length === 0 && unexpected.length === 0,
    missing,
    unexpected,
  };
}
