/**
 * BodyPartSelector Component
 *
 * Modal dialog shown after an X-ray is loaded, asking the user which body part
 * the image shows. The answer decides which mapping configuration and 3D model
 * get loaded, so it cannot be inferred from the image itself.
 *
 * Only "Foot" is real. A mapping config exists for the foot and nothing else
 * (`public/config/foot-mapping.json`), so hand/knee/spine are rendered as
 * unavailable rather than selectable: picking one would load nothing and leave
 * the viewer in a broken state. They stay in the list to show where the tool is
 * going, and are marked `aria-disabled` rather than `disabled` so keyboard and
 * screen reader users can still discover them.
 *
 * Accessibility:
 * - role="dialog" + aria-modal, labelled by its heading and described by its
 *   intro copy.
 * - Focus moves into the dialog on open, is trapped while open (Tab and
 *   Shift+Tab cycle), and returns to the previously focused element on close.
 * - Escape dismisses. The backdrop is click-to-dismiss but is aria-hidden, so
 *   it is never the only way out.
 * - Contrast checked against WCAG AA (4.5:1 normal text) using the palette in
 *   tailwind.config.js:
 *     neutral-900 on white ............ ~18.9:1
 *     neutral-800 on white ............ ~15.1:1
 *     neutral-700 on white ............ ~10.4:1
 *     neutral-600 on neutral-100 ......  ~7.1:1  (unavailable rows)
 *     accent-700 on accent-50 .........  ~6.4:1  (coming soon badge)
 *     white on primary-600 ............  ~6.8:1  (primary action label)
 *     primary-50 on primary-600 .......  ~6.0:1  (primary action subtext)
 *     danger-700 on danger-50 .........  ~7.4:1  (error text)
 *   primary-500 was rejected as the action background: primary-50 subtext on it
 *   lands at ~4.0:1, under the 4.5:1 floor for text this size.
 *
 * _Requirements: 1.6, 1.7, 13.1, 13.2, 13.4, 9.1_
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useBoneVisionStore } from '../stores';

export interface BodyPartSelectorProps {
  /** Called once a body part has been selected and its mapping has loaded. */
  onSelected: () => void;
  /** Called when the user dismisses the dialog without choosing. */
  onDismiss: () => void;
}

interface BodyPartOption {
  id: 'foot' | 'hand' | 'knee' | 'spine';
  label: string;
  /** Short note on what this body part covers, or why it is not ready. */
  description: string;
  available: boolean;
}

/**
 * Only `foot` is marked available. Flipping one of these to `true` requires a
 * matching `public/config/{id}-mapping.json` and a model for that body part.
 */
const BODY_PART_OPTIONS: readonly BodyPartOption[] = [
  {
    id: 'foot',
    label: 'Foot',
    description: 'Ankle, heel, midfoot and toe bones',
    available: true,
  },
  {
    id: 'hand',
    label: 'Hand',
    description: 'Wrist and finger bones',
    available: false,
  },
  {
    id: 'knee',
    label: 'Knee',
    description: 'Kneecap and joint surfaces',
    available: false,
  },
  {
    id: 'spine',
    label: 'Spine',
    description: 'Vertebrae and discs',
    available: false,
  },
];

/** Selector for the elements a focus trap should cycle through. */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function ComingSoonBadge() {
  return (
    <span className="ml-2 inline-flex flex-none items-center rounded-full bg-accent-50 px-2 py-0.5 text-xs font-semibold text-accent-700">
      Coming soon
    </span>
  );
}

export default function BodyPartSelector({
  onSelected,
  onDismiss,
}: BodyPartSelectorProps) {
  const setBodyPart = useBoneVisionStore((state) => state.setBodyPart);

  const dialogRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Move focus into the dialog on open and hand it back on close, so keyboard
  // users are not dropped at the top of the document afterwards.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
      FOCUSABLE_SELECTOR
    );
    firstFocusable?.focus();

    return () => previouslyFocused?.focus?.();
  }, []);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onDismiss();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      // Focus trap: keep Tab and Shift+Tab inside the dialog.
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ??
          []
      );

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onDismiss]
  );

  /**
   * Deliberately inert. The unavailable rows stay focusable for discoverability
   * (see the note at the top), so they need a handler that does nothing rather
   * than the `disabled` attribute that would hide them from the tab order.
   */
  const handleUnavailableSelect = () => undefined;

  const handleSelect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Loads the foot mapping config (and, once Task 16 lands, the model).
      await setBodyPart('foot');
      onSelected();
    } catch (caught) {
      console.error('Failed to load body part configuration', caught);
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not load the foot bone map. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop. Dismissal also lives on Escape and the Cancel button, so
          this click target is purely a convenience and stays hidden from AT. */}
      <div
        className="absolute inset-0 bg-neutral-900/60"
        onClick={onDismiss}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="body-part-selector-title"
        aria-describedby="body-part-selector-description"
        className="animate-slide-up relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-medical-lg"
      >
        <h2
          id="body-part-selector-title"
          className="font-display text-xl font-bold leading-tight text-neutral-900"
        >
          What does this X-ray show?
        </h2>
        <p
          id="body-part-selector-description"
          className="mt-2 text-sm leading-relaxed text-neutral-700"
        >
          Picking the body part tells BoneVision which bone map and 3D model to
          load, so the right bones light up when you explore the image.
        </p>

        <ul className="mt-5 space-y-2">
          {BODY_PART_OPTIONS.map((option) =>
            option.available ? (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={handleSelect}
                  disabled={isLoading}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border-2 border-primary-600 bg-primary-600 px-4 py-3 text-left transition-colors duration-150 hover:bg-primary-700 hover:border-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 disabled:cursor-wait"
                >
                  <span className="min-w-0">
                    <span className="block text-base font-semibold text-white">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-sm text-primary-50">
                      {option.description}
                    </span>
                  </span>
                  {isLoading && (
                    <span
                      className="h-5 w-5 flex-none animate-spin rounded-full border-2 border-white/40 border-t-white"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            ) : (
              <li key={option.id}>
                {/* Focusable but inert: `aria-disabled` keeps the row in the tab
                    order so it is discoverable, while the no-op handler and the
                    muted styling make clear it cannot be chosen yet. */}
                <button
                  type="button"
                  aria-disabled="true"
                  onClick={handleUnavailableSelect}
                  className="flex w-full cursor-not-allowed items-center justify-between gap-3 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-100 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
                >
                  <span className="min-w-0">
                    <span className="block text-base font-semibold text-neutral-600">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-sm text-neutral-600">
                      {option.description}
                    </span>
                  </span>
                  <ComingSoonBadge />
                </button>
              </li>
            )
          )}
        </ul>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm leading-relaxed text-danger-700"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-neutral-200 pt-4">
          <p className="text-xs leading-relaxed text-neutral-600">
            Only foot X-rays are mapped so far.
          </p>
          <button
            type="button"
            onClick={onDismiss}
            className="flex-none rounded-md px-3 py-2 text-sm font-semibold text-neutral-700 transition-colors duration-150 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
