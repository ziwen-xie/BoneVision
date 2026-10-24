# Stores

This directory contains Zustand state management stores for the SkeletonMap application.

## Stores

- **useSkeletonMapStore.ts** - Main application state store ✅ Implemented
- **useEducationalContentStore.ts** - Educational content cache (optional)

## Guidelines

- Use Zustand for lightweight state management
- Keep stores focused and organized by domain
- Follow the `SkeletonMapStore` interface defined in `src/types/index.ts`
- Provide actions for all state mutations
- Consider using immer middleware for complex state updates
