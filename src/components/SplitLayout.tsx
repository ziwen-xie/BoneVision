/**
 * SplitLayout
 *
 * Responsive two-panel container for the X-ray viewer and the 3D model viewer.
 *
 * Layout rules (Requirements 8.1 - 8.4):
 * - Viewport >= 768px (Tailwind `md`): side-by-side, X-ray left / 3D right, 50% width each.
 * - Viewport < 768px: panels stack vertically, X-ray above the 3D viewer.
 *
 * Sizing note: both panels host consumers that measure themselves (a WebGL canvas
 * and a ResizeObserver-driven image box), so every panel gets a *definite* height
 * instead of `height: auto`. Heights resolve as:
 * - below `md`: 60vh with an 18rem floor (stacked, scrollable by the parent)
 * - `md`: 70vh per panel row
 * - `lg` and up: `h-full`, which fills whatever height the parent flex item gives
 *   this component (App gives it the viewport minus the header).
 */

import { Children, type ReactNode } from 'react';

export interface SplitLayoutProps {
  /** Content for the left panel (right panel on stacked layouts: the top panel). */
  left?: ReactNode;
  /** Content for the right panel (bottom panel on stacked layouts). */
  right?: ReactNode;
  /** Alternative to `left`/`right`: the first two children are used as panels. */
  children?: ReactNode;
  /** Extra classes for the layout root, applied last so callers can override. */
  className?: string;
  /** Accessible label for the left/top panel. */
  leftLabel?: string;
  /** Accessible label for the right/bottom panel. */
  rightLabel?: string;
}

const ROOT_CLASSES =
  'flex w-full min-h-0 flex-col md:h-[70vh] md:flex-row lg:h-full';

/** Shared panel sizing. Definite height at every breakpoint - never height:auto. */
const PANEL_CLASSES =
  'relative flex w-full min-w-0 flex-none overflow-hidden h-[60vh] min-h-[18rem] md:h-full md:min-h-0 md:w-1/2';

function SplitLayout({
  left,
  right,
  children,
  className = '',
  leftLabel = 'X-ray viewer',
  rightLabel = '3D model viewer',
}: SplitLayoutProps) {
  // Explicit props win; otherwise fall back to the first two children.
  const usingProps = left !== undefined || right !== undefined;
  const childPanels = usingProps ? [] : Children.toArray(children);

  const leftPanel = usingProps ? left : childPanels[0];
  const rightPanel = usingProps ? right : childPanels[1];

  return (
    <div className={`${ROOT_CLASSES} ${className}`.trim()}>
      <section className={PANEL_CLASSES} aria-label={leftLabel}>
        {leftPanel}
      </section>
      <section
        className={`${PANEL_CLASSES} border-t border-neutral-200 md:border-l md:border-t-0`}
        aria-label={rightLabel}
      >
        {rightPanel}
      </section>
    </div>
  );
}

export default SplitLayout;
