/**
 * BoneMark
 *
 * The BoneVision logo: a single bone, drawn as a rounded shaft with four
 * knuckle circles and rotated 45 degrees.
 *
 * Inline SVG on purpose - no network request for a 1KB mark, and no
 * third-party logo asset to license. Lifted out of Header so the landing page
 * and the app shell render the same mark instead of two drifting copies.
 *
 * Decorative in every current usage: the adjacent text already says
 * "BoneVision", so the mark is `aria-hidden` and screen readers do not
 * announce it twice.
 *
 * _Requirements: 9.1, 13.3_
 */

export interface BoneMarkProps {
  /**
   * Size and colour, as Tailwind classes. Defaults to the header's 24px
   * primary-blue mark; the landing hero passes a larger size.
   */
  className?: string;
}

export default function BoneMark({
  className = 'h-6 w-6 text-primary-500',
}: BoneMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="rotate(-45 12 12)">
        <rect x="5" y="10" width="14" height="4" rx="2" />
        <circle cx="5.5" cy="9.6" r="3" />
        <circle cx="5.5" cy="14.4" r="3" />
        <circle cx="18.5" cy="9.6" r="3" />
        <circle cx="18.5" cy="14.4" r="3" />
      </g>
    </svg>
  );
}
