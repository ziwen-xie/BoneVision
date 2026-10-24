import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SkeletonMapMark from './SkeletonMapMark';

describe('SkeletonMapMark', () => {
  it('renders a compact decorative SVG without duplicating the adjacent name', () => {
    const { container } = render(<SkeletonMapMark className="h-8 w-8" />);
    const mark = container.querySelector('svg');

    expect(mark).toHaveAttribute('viewBox', '0 0 24 24');
    expect(mark).toHaveAttribute('aria-hidden', 'true');
    expect(mark).toHaveAttribute('focusable', 'false');
    expect(mark).toHaveClass('h-8', 'w-8');
    expect(mark?.querySelectorAll('circle')).toHaveLength(4);
    expect(mark?.querySelector('text')).toBeNull();
  });
});
