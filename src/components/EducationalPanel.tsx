/**
 * EducationalPanel Component
 *
 * Displays patient-friendly educational content about the currently active bone.
 * The active bone is whichever bone the user is hovering; if nothing is hovered,
 * it falls back to the bone the user last clicked (hover takes priority so the
 * panel always tracks where the cursor is).
 *
 * Content is read from the mapping configuration via mappingService.getBoneInfo,
 * so the panel stays data-driven and never hard-codes anatomical text.
 *
 * Accessibility notes:
 * - Dynamic content lives inside an aria-live="polite" region with aria-atomic,
 *   so screen readers announce the whole card when the active bone changes.
 * - Semantic landmarks (section/article/h2/h3) give assistive tech real structure.
 * - All foreground/background pairs below were checked against WCAG AA
 *   (4.5:1 normal text, 3:1 large text) using the palette in tailwind.config.js:
 *     neutral-900 on white .......... ~18.9:1
 *     neutral-800 on white .......... ~15.1:1
 *     neutral-700 on white .......... ~10.4:1
 *     neutral-600 on white ..........  ~7.8:1
 *     secondary-900 on secondary-50 .  ~8.9:1
 *     secondary-800 on secondary-50 .  ~7.1:1
 *   neutral-500 (~4.7:1) was deliberately avoided as too marginal.
 *
 * _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 9.1, 9.2, 9.4, 9.6, 13.3, 13.4_
 */

import { useEffect, useState } from 'react';
import { useSkeletonMapStore } from '../stores';
import { getBoneInfo } from '../services/mappingService';
import type { EducationalPanelProps } from '../types';

/**
 * Half of the total crossfade. The content fades out over this duration, swaps,
 * then fades back in, for ~300ms end to end. Requirement 9.2 caps transitions
 * at 100ms-500ms, so keep this between 50 and 250.
 */
const FADE_DURATION_MS = 150;

export default function EducationalPanel({ className = '' }: EducationalPanelProps) {
  // Individual selectors so the panel only re-renders when something it shows changes.
  const hoveredBoneId = useSkeletonMapStore((state) => state.hoveredBoneId);
  const selectedBoneId = useSkeletonMapStore((state) => state.selectedBoneId);
  const mappingConfig = useSkeletonMapStore((state) => state.mappingConfig);

  // Hover wins over selection: the panel follows the cursor, and falls back to
  // the focused bone once the cursor leaves both views.
  const activeBoneId = hoveredBoneId ?? selectedBoneId;

  // `renderedBoneId` lags `activeBoneId` by one fade so the outgoing content can
  // fade out before the incoming content replaces it.
  const [renderedBoneId, setRenderedBoneId] = useState<string | null>(activeBoneId);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (activeBoneId === renderedBoneId) {
      return;
    }

    setIsVisible(false);

    const timer = window.setTimeout(() => {
      setRenderedBoneId(activeBoneId);
      setIsVisible(true);
    }, FADE_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [activeBoneId, renderedBoneId]);

  const boneInfo =
    renderedBoneId && mappingConfig ? getBoneInfo(renderedBoneId, mappingConfig) : null;

  return (
    <section
      aria-label="Bone information"
      className={`flex flex-col rounded-xl border border-neutral-200 bg-white p-6 shadow-medical-lg sm:p-8 ${className}`}
    >
      <div
        aria-live="polite"
        aria-atomic="true"
        className={`flex-1 transition-opacity duration-150 ease-in-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {boneInfo ? (
          <article>
            <h2 className="font-display text-2xl font-bold leading-tight text-neutral-900">
              {boneInfo.name}
            </h2>

            <section className="mt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                What it does
              </h3>
              <p className="mt-2 text-base leading-relaxed text-neutral-800">
                {boneInfo.function}
              </p>
            </section>

            <section className="mt-5 border-t border-neutral-200 pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Common problems
              </h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                {boneInfo.commonInjuries.map((injury) => (
                  <li key={injury} className="text-base leading-relaxed text-neutral-800">
                    {injury}
                  </li>
                ))}
              </ul>
            </section>

            {/*
              Advisory callout, not educational content: it explains what you can
              and cannot see for this bone on this kind of X-ray. Styled as a muted
              info note and visually separated from the anatomy sections above.

              Reads `xrayNote` - the static, per-bone caveat authored in the mapping
              config about how well this bone shows up on this projection. Not to be
              confused with `xrayStatus`, which is reserved for a per-image finding on
              an uploaded X-ray and is not rendered here.
            */}
            {boneInfo.xrayNote && (
              <aside
                role="note"
                className="mt-6 flex gap-3 rounded-lg border border-secondary-200 bg-secondary-50 p-4"
              >
                <svg
                  aria-hidden="true"
                  focusable="false"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="mt-0.5 h-5 w-5 shrink-0 text-secondary-800"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm1-11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-2 3a1 1 0 0 1 2 0v4a1 1 0 0 1-2 0V10Z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary-900">
                    About this X-ray view
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-secondary-800">
                    {boneInfo.xrayNote}
                  </p>
                </div>
              </aside>
            )}
          </article>
        ) : (
          <article>
            <h2 className="font-display text-2xl font-bold leading-tight text-neutral-900">
              Welcome to SkeletonMap
            </h2>
            <p className="mt-4 text-base leading-relaxed text-neutral-800">
              Move your cursor over any bone in the X-ray or the 3D model to read what
              it does and what can go wrong with it. Click a bone to turn the 3D view
              toward it.
            </p>

            <section className="mt-6 border-t border-neutral-200 pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                Moving the 3D model
              </h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li className="text-base leading-relaxed text-neutral-800">
                  Drag to turn the foot around.
                </li>
                <li className="text-base leading-relaxed text-neutral-800">
                  Scroll to move closer or further away.
                </li>
                <li className="text-base leading-relaxed text-neutral-800">
                  Right-click and drag to slide the view.
                </li>
              </ul>
            </section>
          </article>
        )}
      </div>

      {/*
        Standing disclaimer. Lives outside the live region so screen readers do not
        repeat it every time the active bone changes.
      */}
      <footer className="mt-6 border-t border-neutral-200 pt-4">
        <p className="text-xs leading-relaxed text-neutral-600">
          SkeletonMap is a learning tool, not a diagnosis. It describes healthy anatomy
          in general and says nothing about your own health or your own images. If you
          have questions about an X-ray, an injury, or symptoms, talk them through with
          your doctor or another clinician.
        </p>
      </footer>
    </section>
  );
}
