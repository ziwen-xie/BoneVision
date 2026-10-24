/**
 * BodyRegionPicker Component
 *
 * A flat, front-facing SVG body silhouette whose anatomical regions are
 * selectable. It answers "which part of the body is this X-ray of?" by letting
 * someone point at it, rather than reading a list of body part names.
 *
 * Deliberately 2D. The picker's job is region selection, not teaching anatomy,
 * so it is inline SVG authored in `src/models/bodySilhouette.ts` - no 3D
 * geometry, no Three.js, no downloaded anatomy asset. The sourcing decision and
 * the source identified for any future per-bone geometry are recorded in
 * `public/models/README.md`.
 *
 * Honest coverage
 * ---------------
 * Exactly one region is real. `public/config/foot-mapping.json` is the only
 * mapping configuration that exists, so the foot is the only selectable region
 * and every other region renders as visibly unavailable. That is the point of
 * the component: a picker where eight of nine regions silently loaded nothing
 * would be worse than no picker at all. Availability is driven by each region's
 * `bodyPart` field, which is also the value handed to the store, so the styling
 * and the behaviour cannot disagree.
 *
 * Accessibility
 * -------------
 * - Each region is a `role="button"` SVG group with `tabIndex={0}`, activated by
 *   click, Enter or Space. Unavailable regions carry `aria-disabled="true"`
 *   rather than being removed from the tab order, so keyboard and screen reader
 *   users can still discover what is coming.
 * - Focus is indicated by an explicit ring layer drawn on top of the regions.
 *   An SVG path takes no CSS outline and no Tailwind `focus-visible:ring-*`, so
 *   the ring is real geometry: a wide white stroke under a narrow dark one.
 *   Neither stroke clears 3:1 everywhere on its own, which is why there are two.
 *   On the dark available fill the white halo carries it (6.75:1) where the dark
 *   stroke would fail (2.66:1); on the muted unavailable fill and on the white
 *   card the dark stroke carries it (12.09:1 and 17.93:1) where the halo would
 *   fail (1.48:1 and 1.00:1). One of the two always clears 3:1 against whatever
 *   sits behind it, which is what WCAG 1.4.11 asks of a focus indicator.
 * - The silhouette filler (neck, abdomen, thighs, shins) is artwork and is
 *   `aria-hidden`, so screen reader output describes the nine controls, not the
 *   drawing.
 * - The live region announces the region under the pointer and the outcome of a
 *   selection. It deliberately does not echo keyboard focus: the roled groups
 *   are already announced natively on focus, and repeating that here would
 *   double up on every Tab press.
 *
 * Contrast, computed from the palette hex values in tailwind.config.js
 * (WCAG AA: 4.5:1 for normal text, 3:1 for large text and non-text):
 *     text    neutral-900 #171717 on white .................... 17.93:1
 *     text    neutral-700 #404040 on white .................... 10.37:1
 *     text    neutral-600 #525252 on white ..................... 7.81:1
 *     text    accent-700  #92400e on accent-50 #fef3c7 ......... 6.37:1
 *     text    danger-700  #b91c1c on danger-50 #fef2f2 ......... 5.91:1
 *     region  primary-600 #005ab3 on white ..................... 6.75:1
 *     region  primary-600 #005ab3 on silhouette #e5e5e5 ........ 5.35:1
 *     region  primary-700 #004080 on white .................... 10.27:1
 *     region  neutral-500 #737373 edge on #d4d4d4 fill ......... 3.20:1
 *     region  neutral-500 #737373 edge on silhouette #e5e5e5 ... 3.76:1
 *     state   accent-300  #fbbf24 edge on primary-700 fill ..... 6.15:1
 *     focus   white halo on primary-600 fill ................... 6.75:1
 *     focus   neutral-900 ring on white halo .................. 17.93:1
 *     focus   neutral-900 ring on neutral-300 fill ............ 12.09:1
 *     focus   neutral-900 ring on white card .................. 17.93:1
 * neutral-500 is used only for non-text region edges, where the floor is 3:1.
 * It is never used for text: 4.74:1 on white is too close to the 4.5:1 line,
 * matching how the rest of the codebase treats it.
 *
 * Requirements: 1.6, 1.7, 9.1, 9.2, 12.6, 13.1, 13.2, 13.3, 13.4
 */

import {
  useCallback,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useBoneVisionStore } from '../stores';
import {
  BODY_REGIONS,
  SILHOUETTE_FILLER_PATHS,
  SILHOUETTE_VIEW_BOX,
  type BodyRegion,
} from '../models/bodySilhouette';

/**
 * Palette values lifted from tailwind.config.js. They are inlined as SVG
 * presentation attributes rather than Tailwind `fill-*` classes because the fill
 * depends on three pieces of state at once, and because the contrast table at
 * the top of this file has to be checkable against the exact values in use.
 */
const PALETTE = {
  /** neutral-200: the decorative body, behind and between the regions. */
  silhouette: '#e5e5e5',
  /** neutral-300: outline of the decorative body. */
  silhouetteEdge: '#d4d4d4',
  /** neutral-300 / neutral-500: unavailable region and its dashed edge. */
  unavailableFill: '#d4d4d4',
  unavailableEdge: '#737373',
  /** neutral-600: unavailable edge while hovered or focused. */
  unavailableEdgeActive: '#525252',
  /** primary-600 / primary-700: the available region, idle then engaged. */
  availableFill: '#005ab3',
  availableFillActive: '#004080',
  availableEdge: '#004080',
  /** accent-300: marks the region whose bone map is currently loaded. */
  selectedEdge: '#fbbf24',
  /** The two strokes of the focus ring. */
  focusRingHalo: '#ffffff',
  focusRing: '#171717',
} as const;

const REGION_EDGE_WIDTH = 1.5;
const SELECTED_EDGE_WIDTH = 2.5;
const FOCUS_RING_HALO_WIDTH = 6;
const FOCUS_RING_WIDTH = 2.5;

export interface BodyRegionPickerProps {
  /**
   * Called with the region id once its bone map has loaded successfully. Lets
   * the mounting code route onward or dismiss a modal; the picker itself stays
   * unaware of routing so it can be used in either place.
   */
  onRegionSelected?: (region: string) => void;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

/** How many regions a mapping configuration actually exists for. Currently 1. */
const AVAILABLE_COUNT = BODY_REGIONS.filter((region) => region.bodyPart).length;

/** Screen reader label: the body part plus whether it can be chosen. */
function regionLabel(region: BodyRegion): string {
  return region.bodyPart
    ? `${region.name}: ${region.summary}. Available, select to load the bone map.`
    : `${region.name}: ${region.summary}. Not available yet, coming soon.`;
}

function regionFill(region: BodyRegion, isActive: boolean): string {
  if (!region.bodyPart) {
    return PALETTE.unavailableFill;
  }

  return isActive ? PALETTE.availableFillActive : PALETTE.availableFill;
}

function regionEdge(
  region: BodyRegion,
  isActive: boolean,
  isLoaded: boolean
): string {
  if (!region.bodyPart) {
    return isActive ? PALETTE.unavailableEdgeActive : PALETTE.unavailableEdge;
  }

  return isLoaded ? PALETTE.selectedEdge : PALETTE.availableEdge;
}

function ComingSoonBadge() {
  return (
    <span className="inline-flex flex-none items-center rounded-full bg-accent-50 px-2 py-0.5 text-xs font-semibold text-accent-700">
      Coming soon
    </span>
  );
}

export default function BodyRegionPicker({
  onRegionSelected,
  className = '',
}: BodyRegionPickerProps) {
  const setBodyPart = useBoneVisionStore((state) => state.setBodyPart);
  const loadedBodyPart = useBoneVisionStore((state) => state.bodyPart);

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Text for the polite live region. See the note on announcements above. */
  const [announcement, setAnnouncement] = useState('');

  // Keyboard focus wins over the pointer, so tabbing away from a region the
  // mouse happens to be resting on still updates the caption.
  const activeId = focusedId ?? hoveredId;
  const activeRegion = BODY_REGIONS.find((region) => region.id === activeId);
  const focusedRegion = BODY_REGIONS.find((region) => region.id === focusedId);

  const activate = useCallback(
    async (region: BodyRegion) => {
      // Unavailable regions stay focusable for discoverability, so this is the
      // handler that makes them inert. A load already in flight also swallows
      // further activations rather than racing a second fetch.
      if (!region.bodyPart || loadingId) {
        return;
      }

      setLoadingId(region.id);
      setError(null);
      setAnnouncement(`Loading the ${region.name.toLowerCase()} bone map.`);

      try {
        // The store owns loading. Reusing `setBodyPart` keeps this picker on the
        // same path as BodyPartSelector and demo startup instead of adding a
        // second way for `mappingConfig` to arrive.
        await setBodyPart(region.bodyPart);
      } catch (caught) {
        console.error('Failed to load body part configuration', caught);

        // `setBodyPart` already wrote this to the store's `errorMessage`, which
        // the app shell renders. It is surfaced locally too because the picker
        // can be mounted outside that shell (a landing page, a modal), where
        // the shell's banner is not on screen to catch it.
        const message =
          caught instanceof Error
            ? caught.message
            : `Could not load the ${region.name.toLowerCase()} bone map. Please try again.`;

        setError(message);
        setAnnouncement(message);
        setLoadingId(null);
        return;
      }

      setLoadingId(null);
      setAnnouncement(`${region.name} bone map loaded.`);
      onRegionSelected?.(region.id);
    },
    [loadingId, setBodyPart, onRegionSelected]
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<SVGGElement>, region: BodyRegion) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      // Space would scroll the page, and a roled group gets no implicit button
      // behaviour, so both keys are handled explicitly.
      event.preventDefault();
      void activate(region);
    },
    [activate]
  );

  const handlePointerEnter = useCallback((region: BodyRegion) => {
    setHoveredId(region.id);
    setAnnouncement(regionLabel(region));
  }, []);

  const handlePointerLeave = useCallback(() => {
    setHoveredId(null);
  }, []);

  const handleFocus = useCallback((region: BodyRegion) => {
    setFocusedId(region.id);
  }, []);

  const handleBlur = useCallback(() => {
    setFocusedId(null);
  }, []);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        viewBox={SILHOUETTE_VIEW_BOX}
        role="group"
        aria-label={`Body regions. ${AVAILABLE_COUNT} of ${BODY_REGIONS.length} regions available.`}
        className="h-auto w-full max-w-[18rem]"
      >
        {/* Decorative framing: the parts of the body that are not controls. */}
        <g
          aria-hidden="true"
          fill={PALETTE.silhouette}
          stroke={PALETTE.silhouetteEdge}
          strokeWidth={1}
          style={{ pointerEvents: 'none' }}
        >
          {SILHOUETTE_FILLER_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>

        {BODY_REGIONS.map((region) => {
          const isAvailable = Boolean(region.bodyPart);
          const isActive = activeId === region.id;
          const isLoaded =
            isAvailable && loadedBodyPart === region.bodyPart;
          const isLoading = loadingId === region.id;

          return (
            <g
              key={region.id}
              role="button"
              tabIndex={0}
              aria-label={regionLabel(region)}
              aria-disabled={isAvailable ? undefined : true}
              aria-busy={isLoading ? true : undefined}
              onClick={() => void activate(region)}
              onKeyDown={(event) => handleKeyDown(event, region)}
              onFocus={() => handleFocus(region)}
              onBlur={handleBlur}
              onMouseEnter={() => handlePointerEnter(region)}
              onMouseLeave={handlePointerLeave}
              fill={regionFill(region, isActive)}
              stroke={regionEdge(region, isActive, isLoaded)}
              strokeWidth={isLoaded ? SELECTED_EDGE_WIDTH : REGION_EDGE_WIDTH}
              strokeDasharray={isAvailable ? undefined : '5 4'}
              opacity={isLoading ? 0.75 : 1}
              // The native outline is replaced by the explicit ring layer below.
              style={{
                cursor: isAvailable ? 'pointer' : 'not-allowed',
                outline: 'none',
                transition: 'fill 150ms ease-in-out, stroke 150ms ease-in-out',
              }}
            >
              <title>
                {isAvailable
                  ? `${region.name} - ${region.summary}`
                  : `${region.name} - coming soon`}
              </title>
              {region.paths.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
          );
        })}

        {/* Focus ring, on its own layer so it is never overpainted by a region
            drawn later in the document. Kept out of hit testing and out of the
            accessibility tree - it is a rendering of focus, not a control. */}
        {focusedRegion && (
          <g aria-hidden="true" fill="none" style={{ pointerEvents: 'none' }}>
            {focusedRegion.paths.map((d) => (
              <path
                key={`halo-${d}`}
                d={d}
                stroke={PALETTE.focusRingHalo}
                strokeWidth={FOCUS_RING_HALO_WIDTH}
              />
            ))}
            {focusedRegion.paths.map((d) => (
              <path
                key={`ring-${d}`}
                d={d}
                stroke={PALETTE.focusRing}
                strokeWidth={FOCUS_RING_WIDTH}
              />
            ))}
          </g>
        )}
      </svg>

      {/* Caption. Fixed minimum height so moving between regions does not
          reflow everything below the picker. */}
      <div className="mt-4 min-h-[4.5rem] w-full max-w-sm text-center">
        {activeRegion ? (
          <>
            <p className="flex flex-wrap items-center justify-center gap-2 text-base font-semibold leading-tight text-neutral-900">
              {activeRegion.name}
              {!activeRegion.bodyPart && <ComingSoonBadge />}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-neutral-700">
              {loadingId === activeRegion.id
                ? 'Loading the bone map...'
                : activeRegion.summary}
            </p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-neutral-700">
            Hover or tab to a region to see what it covers. Only the feet are
            mapped so far.
          </p>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-2 w-full max-w-sm rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm leading-relaxed text-danger-700"
        >
          {error}
        </p>
      )}

      <p className="mt-2 text-xs leading-relaxed text-neutral-600">
        {AVAILABLE_COUNT} of {BODY_REGIONS.length} regions mapped. The rest are
        shown so you can see where BoneVision is going.
      </p>

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
