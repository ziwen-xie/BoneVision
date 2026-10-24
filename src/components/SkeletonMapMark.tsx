/**
 * Original SkeletonMap brand mark.
 *
 * A rounded scan frame surrounds a map-like anatomical contour. The connected
 * path and joints suggest articulated bone anatomy; the coral node marks the
 * selected location. Broad shapes and restrained contrast keep it legible at
 * the 24px size used in navigation.
 *
 * Every current placement sits beside the product name, so the SVG is hidden
 * from assistive technology to avoid announcing the same identity twice.
 *
 * _Requirements: 9.1, 13.3_
 */

export interface SkeletonMapMarkProps {
  /** Sizing and layout classes supplied by the placement. */
  className?: string;
}

export default function SkeletonMapMark({
  className = 'h-6 w-6',
}: SkeletonMapMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2.25" y="2.25" width="19.5" height="19.5" rx="5" fill="#EAF6FB" />
      <path
        d="M8 4.75H6.5c-.97 0-1.75.78-1.75 1.75V8M16 4.75h1.5c.97 0 1.75.78 1.75 1.75V8M19.25 16v1.5c0 .97-.78 1.75-1.75 1.75H16M8 19.25H6.5c-.97 0-1.75-.78-1.75-1.75V16"
        stroke="#0B5C8E"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6.4 10.1c.65-2.5 2.95-4.25 5.55-4.05 2.05.15 2.6 1.18 4.38 1.55 1.12.23 1.72 1.1 1.45 2.12-.3 1.15-1.63 1.43-2.08 2.48-.55 1.28.23 2.38-.58 3.78-.85 1.47-2.62 2.3-4.28 1.98-2.18-.42-2.45-2.15-3.72-3.18-1.17-.97-1.08-3.27-.72-4.68Z"
        fill="#CDEDEA"
        stroke="#4A9F9A"
        strokeWidth="0.85"
        strokeLinejoin="round"
      />
      <path
        d="m7.7 16.25 2.65-2.85 3.15-1.3 2.75-4.15"
        stroke="#184E77"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7.7" cy="16.25" r="1.15" fill="#FFFFFF" stroke="#184E77" strokeWidth="1" />
      <circle cx="10.35" cy="13.4" r="1.15" fill="#FFFFFF" stroke="#184E77" strokeWidth="1" />
      <circle cx="16.25" cy="7.95" r="1.15" fill="#FFFFFF" stroke="#184E77" strokeWidth="1" />
      <circle cx="13.5" cy="12.1" r="1.85" fill="#F26B5B" stroke="#FFFFFF" strokeWidth="0.9" />
    </svg>
  );
}
