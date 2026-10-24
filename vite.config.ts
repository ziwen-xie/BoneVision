import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://<user>.github.io/BoneVision/ , so every emitted asset
  // URL needs that prefix. Runtime fetches of /demo and /config read
  // `import.meta.env.BASE_URL`, which Vite derives from this value, so the two
  // can never drift apart. Override with BONEVISION_BASE for another host
  // (a root-domain deploy wants '/').
  base: process.env.BONEVISION_BASE ?? '/BoneVision/',
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
