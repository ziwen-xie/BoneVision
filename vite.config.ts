import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://ziwen-xie.github.io/SkeletonMap/, so every emitted
  // asset URL needs the project prefix. Runtime fetches derive their paths from
  // `import.meta.env.BASE_URL`, keeping code and deployment configuration in
  // sync. Override with SKELETONMAP_BASE when deploying at another path (use
  // '/' for a root-domain deployment).
  base: process.env.SKELETONMAP_BASE ?? '/SkeletonMap/',
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
})
