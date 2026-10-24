/// <reference types="vitest/config" />

/**
 * Vitest configuration.
 *
 * Kept separate from `vite.config.ts` so the dev/build pipeline and the test pipeline can
 * drift independently - the test run needs a jsdom environment and a setup file that the
 * production build must never pull in. Vitest merges this with `vite.config.ts`
 * automatically, so the React plugin and resolve aliases defined there still apply.
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom gives the DOM APIs the services and components reach for (FileReader, Image,
    // document). Pure-math utils do not need it, but a single environment keeps the
    // config honest and the run is still fast.
    environment: 'jsdom',

    // `globals: true` lets the existing tests keep calling describe/it/expect, and is
    // what makes the `vitest/globals` types in tsconfig meaningful.
    globals: true,

    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',

      // Every source file is reported, not just the ones a test happened to import, so an
      // untested module shows up as a 0% row instead of vanishing from the denominator.
      // (Vitest 4 does this by default; the old `all: true` flag no longer exists.)
      include: ['src/**/*.{ts,tsx}'],

      exclude: [
        // Config and build plumbing.
        '**/*.config.{ts,js}',
        'src/vite-env.d.ts',
        'src/main.tsx',

        // Type-only modules: no runtime statements to cover.
        'src/types/**',
        '**/*.d.ts',

        // Test files and test support themselves.
        'src/test/**',
        '**/*.{test,spec}.{ts,tsx}',

        // Geometry construction for the foot skeleton. This is a long list of literal
        // vertex/transform declarations whose correctness is visual - meaningful coverage
        // needs a GPU-adjacent harness that renders and inspects the result, not line
        // execution. Counting its lines would inflate the overall number without
        // asserting anything, so it is excluded rather than left to drag the gate down.
        'src/models/footSkeleton.ts',
      ],

      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
