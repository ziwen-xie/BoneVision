/**
 * Global test setup, run once per test file before any test executes.
 *
 * Registers the jest-dom matchers (`toBeInTheDocument`, `toHaveAttribute`, ...) and makes
 * sure no test can leak DOM nodes or patched globals into the next one.
 */

import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  // Unmount anything React Testing Library rendered. Vitest's `globals: true` does not
  // imply RTL's auto-cleanup, so this has to be explicit.
  cleanup();
});
