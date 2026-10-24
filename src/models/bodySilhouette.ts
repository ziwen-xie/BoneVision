/**
 * Geometry for the 2D body region picker.
 *
 * This is a flat, front-facing SVG silhouette, deliberately not a 3D skeleton.
 * Its only job is to let someone point at a part of the body, so it does not
 * justify the download or the licensing work a real per-bone mesh would need -
 * see `public/models/README.md` for the full sourcing decision.
 *
 * Coordinate space
 * ----------------
 * All path data is authored in a `0 0 200 456` viewBox with the figure centred
 * on x = 100 and inset roughly 30 units from each side. The side margins are
 * load-bearing: the focus ring is a stroke drawn around a region's outline and
 * would clip against the viewBox edge without them.
 *
 * Layout invariant
 * ----------------
 * Interactive regions never overlap each other. Anatomically adjacent regions
 * are separated by a ~2 unit seam so a click resolves to exactly one region
 * with no z-order tie-breaking, and the gaps between them (neck, abdomen,
 * thighs, shins) are filled by `SILHOUETTE_FILLER_PATHS`, which is decorative
 * and never interactive. Together the two layers read as one body.
 *
 * Requirements: 1.6, 1.7, 9.1, 9.2
 */

/** The viewBox every path below is authored against. */
export const SILHOUETTE_VIEW_BOX = '0 0 200 456';

/**
 * Body part keys the store knows how to load. Mirrors the parameter type of
 * `setBodyPart` in `src/stores/useSkeletonMapStore.ts`.
 */
export type SelectableBodyPart = 'foot';

export interface BodyRegion {
  /** Stable identifier, used for React keys and DOM ids. */
  id: string;
  /** Human-readable region name, shown in the caption and the ARIA label. */
  name: string;
  /** Plain-language note on what the region covers, or why it is not ready. */
  summary: string;
  /**
   * The body part this region loads, or `null` when no mapping configuration
   * exists for it yet.
   *
   * This doubles as the availability flag on purpose. A separate `available`
   * boolean could drift away from the thing that actually loads; here, making a
   * region selectable means naming the body part it loads, and the type checker
   * rejects any name the store cannot accept. Adding the hand means shipping
   * `public/config/hand-mapping.json`, widening `SelectableBodyPart`, and
   * setting `bodyPart: 'hand'` below - in that order.
   */
  bodyPart: SelectableBodyPart | null;
  /**
   * One or more SVG path commands making up the region. Bilateral regions use
   * two entries (left and right) so both limbs activate as a single target
   * rather than forcing a pointless left/right choice.
   */
  paths: readonly string[];
}

/**
 * Decorative connective tissue: neck, abdomen, thighs and shins. These fill the
 * gaps between interactive regions so the figure reads as a body instead of a
 * scatter of shapes. Rendered inside an `aria-hidden` group and excluded from
 * hit testing, because they are the artwork, not the controls.
 */
export const SILHOUETTE_FILLER_PATHS: readonly string[] = [
  // Neck, bridging the skull and the shoulder line.
  'M 89 58 L 111 58 L 111 74 L 89 74 Z',
  // Abdomen, between the rib blocks and the pelvis.
  'M 64 158 L 136 158 L 134 186 L 66 186 Z',
  // Left thigh.
  'M 70 230 L 96 230 L 94 288 L 70 288 Z',
  // Right thigh.
  'M 130 230 L 104 230 L 106 288 L 130 288 Z',
  // Left shin.
  'M 71 324 L 93 324 L 90 396 L 74 396 Z',
  // Right shin.
  'M 129 324 L 107 324 L 110 396 L 126 396 Z',
];

/**
 * The selectable regions, in the order they appear in the tab sequence.
 *
 * Order is head-to-toe rather than grouped by availability: the one available
 * region sitting at the end of a top-down walk is itself information about how
 * much of the body is mapped, and reordering to surface the foot first would
 * quietly hide that. The caption and the "Coming soon" badge do the work of
 * making the foot findable.
 */
export const BODY_REGIONS: readonly BodyRegion[] = [
  {
    id: 'head',
    name: 'Skull',
    summary: 'Cranium and jaw',
    bodyPart: null,
    paths: ['M 72 36 A 28 28 0 0 1 128 36 A 28 28 0 0 1 72 36 Z'],
  },
  {
    id: 'shoulder',
    name: 'Shoulders',
    summary: 'Collarbone, shoulder blade and joint',
    bodyPart: null,
    paths: [
      'M 89 70 L 62 70 Q 44 70 44 90 L 45 104 L 89 104 Z',
      'M 111 70 L 138 70 Q 156 70 156 90 L 155 104 L 111 104 Z',
    ],
  },
  {
    id: 'chest',
    name: 'Chest and ribs',
    summary: 'Rib cage and breastbone',
    bodyPart: null,
    paths: [
      'M 56 106 L 89 106 L 89 158 L 64 158 Q 56 150 56 128 Z',
      'M 144 106 L 111 106 L 111 158 L 136 158 Q 144 150 144 128 Z',
    ],
  },
  {
    id: 'spine',
    name: 'Spine',
    summary: 'Vertebrae from neck to lower back',
    bodyPart: null,
    paths: ['M 89 70 L 111 70 L 111 184 L 89 184 Z'],
  },
  {
    id: 'arm',
    name: 'Arms',
    summary: 'Upper arm and forearm bones',
    bodyPart: null,
    paths: [
      'M 38 106 L 56 106 L 52 208 L 32 208 Z',
      'M 162 106 L 144 106 L 148 208 L 168 208 Z',
    ],
  },
  {
    id: 'hand',
    name: 'Hands',
    summary: 'Wrist, palm and finger bones',
    bodyPart: null,
    paths: [
      'M 32 210 L 52 210 L 50 240 Q 42 250 34 240 Z',
      'M 168 210 L 148 210 L 150 240 Q 158 250 166 240 Z',
    ],
  },
  {
    id: 'pelvis',
    name: 'Pelvis and hips',
    summary: 'Hip bones and hip joints',
    bodyPart: null,
    paths: [
      'M 62 186 L 138 186 L 134 214 Q 124 230 100 230 Q 76 230 66 214 Z',
    ],
  },
  {
    id: 'knee',
    name: 'Knees',
    summary: 'Kneecap and joint surfaces',
    bodyPart: null,
    paths: [
      'M 70 288 L 94 288 Q 98 306 94 324 L 70 324 Q 66 306 70 288 Z',
      'M 130 288 L 106 288 Q 102 306 106 324 L 130 324 Q 134 306 130 288 Z',
    ],
  },
  {
    id: 'foot',
    name: 'Feet',
    summary: 'Ankle, heel, midfoot and toe bones',
    bodyPart: 'foot',
    paths: [
      'M 74 396 L 90 396 L 92 420 Q 92 442 70 442 Q 52 442 50 430 Q 50 420 64 414 Z',
      'M 126 396 L 110 396 L 108 420 Q 108 442 130 442 Q 148 442 150 430 Q 150 420 136 414 Z',
    ],
  },
];
